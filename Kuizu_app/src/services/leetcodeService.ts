/**
 * LeetCode Service for KUIZU
 * Handles:
 * - Parsing LeetCode usernames from links and raw inputs
 * - Live fetching of solved problem counts
 * - Daily 12:00 PM auto-synchronization (runs strictly once per day after 12 PM)
 * - Saving updated counts directly to Supabase users database
 */

import { supabase } from './supabaseApiBridge';

export function extractLeetCodeUsername(urlOrUsername: string): string {
  if (!urlOrUsername) return '';
  let str = urlOrUsername.trim();
  str = str.replace(/^[a-z]+:\/\//i, '');
  str = str.replace(/^(www\.)?leetcode\.com\/?/i, '');
  str = str.replace(/^u\//i, '');
  str = str.split('/')[0].split('?')[0].split('#')[0].trim();
  return str;
}

export interface LeetCodeStatsResult {
  success: boolean;
  username: string;
  solved: number;
  easy?: number;
  medium?: number;
  hard?: number;
  error?: string;
  source?: string;
}

/**
 * Fetch live problem solved count for a LeetCode user profile link or username
 */
export async function fetchLeetCodeStats(urlOrUsername: string): Promise<LeetCodeStatsResult> {
  const username = extractLeetCodeUsername(urlOrUsername);
  if (!username) {
    return { success: false, username: '', solved: 0, error: 'Please enter a valid LeetCode username or profile link.' };
  }

  // 1. Try our Vercel / serverless endpoint first
  try {
    const res = await fetch(`/api/leetcode?username=${encodeURIComponent(username)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && typeof data.solved === 'number') {
        return data;
      }
    }
  } catch (err) {
    console.warn('[leetcodeService] /api/leetcode network error, trying fallback:', err);
  }

  // 2. Direct client fallback via public mirrors
  try {
    const mirrorRes = await fetch(`https://alfa-leetcode-api.onrender.com/${encodeURIComponent(username)}/solved`);
    if (mirrorRes.ok) {
      const data = await mirrorRes.json();
      if (typeof data.solvedProblem === 'number') {
        return {
          success: true,
          username,
          solved: data.solvedProblem,
          easy: data.easySolved ?? 0,
          medium: data.mediumSolved ?? 0,
          hard: data.hardSolved ?? 0,
          source: 'alfa-api'
        };
      }
    }
  } catch (mErr) {
    console.warn('[leetcodeService] Mirror 1 fallback error:', mErr);
  }

  // 3. Fallback mirror 2
  try {
    const m2Res = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${encodeURIComponent(username)}`);
    if (m2Res.ok) {
      const data = await m2Res.json();
      if (typeof data.totalSolved === 'number') {
        return {
          success: true,
          username,
          solved: data.totalSolved,
          easy: data.easySolved ?? 0,
          medium: data.mediumSolved ?? 0,
          hard: data.hardSolved ?? 0,
          source: 'faisalshohag-api'
        };
      }
    }
  } catch (m2Err) {
    console.warn('[leetcodeService] Mirror 2 fallback error:', m2Err);
  }

  return {
    success: false,
    username,
    solved: 0,
    error: `Could not reach LeetCode for @${username}. Please verify the profile link.`
  };
}

/**
 * Checks if today's 12:00 PM sync is due
 * Returns true if current time is >= 12:00 PM and user has not yet synced today
 */
export function isDaily12PMSyncDue(lastSyncDate: string | null | undefined): boolean {
  const now = new Date();
  const currentHour = now.getHours(); // 0-23
  if (currentHour < 12) {
    // Before 12:00 PM: today's 12 PM sync has not arrived yet
    return false;
  }
  const todayDate = now.toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
  // If last sync was already today, it should NOT run again ("only once")
  return lastSyncDate !== todayDate;
}

/**
 * Get human-readable status of the 12 PM sync
 */
export function getDailySyncStatusText(lastSyncDate: string | null | undefined): string {
  const now = new Date();
  const todayDate = now.toLocaleDateString('en-CA');
  const currentHour = now.getHours();

  if (lastSyncDate === todayDate) {
    return 'Synced today at 12:00 PM (Daily sync completed)';
  }

  if (currentHour < 12) {
    return 'Scheduled today at 12:00 PM (Runs daily once)';
  }

  return 'Daily 12:00 PM sync due';
}

/**
 * Perform 12:00 PM daily LeetCode solved count sync for a user and save directly to Supabase
 */
export async function performDailyLeetCodeSync(user: any): Promise<{
  synced: boolean;
  newCount?: number;
  error?: string;
  user?: any;
}> {
  if (!user || !user.leetcode_url) {
    return { synced: false, error: 'No LeetCode profile link added for this user' };
  }

  const todayDate = new Date().toLocaleDateString('en-CA');
  if (!isDaily12PMSyncDue(user.last_leetcode_sync)) {
    return { synced: false, error: 'Already synced today at 12 PM or scheduled for 12 PM' };
  }

  console.log(`[leetcodeService] Running 12:00 PM daily LeetCode sync for user ${user.id || user.email}...`);

  const stats = await fetchLeetCodeStats(user.leetcode_url);
  if (!stats.success) {
    console.warn('[leetcodeService] Daily 12 PM sync failed to fetch LeetCode stats:', stats.error);
    return { synced: false, error: stats.error };
  }

  const newSolvedCount = stats.solved;

  try {
    // 1. Direct Supabase update
    const { data: updatedUser, error: updateErr } = await supabase
      .from('users')
      .update({
        leetcode_solved: newSolvedCount,
        last_leetcode_sync: todayDate,
        last_active: 'Today'
      })
      .or(`id.eq.${user.id},email.ilike.${user.email}`)
      .select()
      .single();

    if (updateErr) {
      console.warn('[leetcodeService] Supabase update warning:', updateErr);
    }

    // 2. Also sync through API bridge
    try {
      await fetch(`/api/users/${user.id}/links`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leetcodeSolved: newSolvedCount,
          lastLeetcodeSync: todayDate
        })
      });
    } catch (_) {}

    return {
      synced: true,
      newCount: newSolvedCount,
      user: updatedUser || { ...user, leetcode_solved: newSolvedCount, last_leetcode_sync: todayDate }
    };
  } catch (err: any) {
    console.error('[leetcodeService] Failed to persist daily LeetCode sync:', err);
    return { synced: false, error: err.message || String(err) };
  }
}
