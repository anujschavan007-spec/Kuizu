import './supabaseApiBridge';
import { supabase } from './supabaseApiBridge';

export interface ViolationRecord {
  id: string;
  contestId: string;
  contestTitle: string;
  username: string;
  userEmail: string;
  userAvatar?: string;
  violationType: 'TAB_SWITCH' | 'CLIPBOARD_PASTE' | 'CLIPBOARD_COPY' | 'CLIPBOARD_CUT' | 'DEVTOOLS_INSPECT' | 'CONTEXT_MENU' | 'TEXT_SELECTION' | string;
  details: string;
  severity: 'warning' | 'high' | 'critical';
  timestamp: string;
  status: 'flagged' | 'warned' | 'disqualified' | 'dismissed';
}

const lastViolationTimes: Record<string, number> = {};

/**
 * Retrieve active candidate info from local storage or profile session
 */
export function getRealUserInfo(): { username: string; userEmail: string; userAvatar: string } {
  let username = (localStorage.getItem('kuizu_user_name') || '').trim();
  let userEmail = (localStorage.getItem('kuizu_user_email') || '').trim();
  let userAvatar = (localStorage.getItem('kuizu_user_avatar') || '').trim();

  if (!username || !userEmail) {
    try {
      const profile = JSON.parse(localStorage.getItem('kuizu_user_profile') || '{}');
      if (profile.name && !username) username = profile.name.trim();
      if (profile.email && !userEmail) userEmail = profile.email.trim();
      if (profile.avatar && !userAvatar) userAvatar = profile.avatar.trim();
    } catch {}
  }

  if (!username && userEmail) {
    const prefix = userEmail.split('@')[0];
    username = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  if (!username) {
    username = 'Candidate';
  }
  if (!userEmail) {
    userEmail = 'candidate@kuizu.io';
  }

  return { username, userEmail, userAvatar };
}

/**
 * Log a genuine proctoring violation from any assessment arena
 */
export async function logRealViolation(params: {
  contestId?: string;
  contestTitle?: string;
  violationType: 'TAB_SWITCH' | 'CLIPBOARD_PASTE' | 'CLIPBOARD_COPY' | 'CLIPBOARD_CUT' | 'DEVTOOLS_INSPECT' | 'CONTEXT_MENU' | 'TEXT_SELECTION' | string;
  details: string;
  severity?: 'warning' | 'high' | 'critical';
}): Promise<ViolationRecord | null> {
  const now = Date.now();
  const lastTime = lastViolationTimes[params.violationType] || 0;
  // Throttle duplicate violations within 1.2s to prevent event spamming
  if (now - lastTime < 1200) return null;
  lastViolationTimes[params.violationType] = now;

  const user = getRealUserInfo();
  const contestId = params.contestId || 'active-contest';
  const contestTitle = params.contestTitle || 'Live Assessment';
  const severity = params.severity || 'warning';

  const record: ViolationRecord = {
    id: `viol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    contestId,
    contestTitle,
    username: user.username,
    userEmail: user.userEmail,
    userAvatar: user.userAvatar,
    violationType: params.violationType,
    details: params.details,
    severity,
    timestamp: new Date().toISOString(),
    status: 'flagged'
  };

  // 1. Instant local persistence for real-time same-browser cross-tab sync
  try {
    let list: ViolationRecord[] = [];
    const raw = localStorage.getItem('kuizu_contest_violations');
    if (raw) list = JSON.parse(raw);
    list.unshift(record);
    if (list.length > 500) list = list.slice(0, 500);
    localStorage.setItem('kuizu_contest_violations', JSON.stringify(list));
    localStorage.setItem('kuizu_last_violation_signal', JSON.stringify({ id: record.id, t: Date.now() }));
    window.dispatchEvent(new CustomEvent('kuizu_violation_recorded', { detail: record }));
  } catch (e) {
    console.warn('[Proctoring] Local storage error:', e);
  }

  // 2. Direct Supabase insertion for cloud persistence across separate devices
  try {
    if (supabase) {
      supabase.from('contest_violations').insert({
        id: record.id,
        contest_id: record.contestId,
        contest_title: record.contestTitle,
        username: record.username,
        user_email: record.userEmail,
        user_avatar: record.userAvatar,
        violation_type: record.violationType,
        details: record.details,
        severity: record.severity,
        timestamp: record.timestamp,
        status: record.status
      }).then((res: any) => {
        if (res?.error) {
          console.warn('[Proctoring] Supabase insert note:', res.error.message || res.error);
        }
      });
    }
  } catch {}

  // 3. API Route POST (handles local server sqlite & client bridge)
  try {
    fetch('/api/contests/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(() => {});
  } catch {}

  return record;
}

/**
 * Clean helper to attach live proctoring detectors to any assessment session
 */
export function initExamProctoring(config: {
  getContestInfo: () => { contestId: string; contestTitle: string; isRunning: boolean };
  onWarning?: (msg: string) => void;
  allowCopyPaste?: boolean;
}) {
  let tabSwitchCount = 0;

  const handleVisibilityChange = () => {
    const info = config.getContestInfo();
    if (!info.isRunning) return;

    if (document.hidden) {
      tabSwitchCount++;
      const severity = tabSwitchCount >= 3 ? 'critical' : tabSwitchCount === 2 ? 'high' : 'warning';
      logRealViolation({
        contestId: info.contestId,
        contestTitle: info.contestTitle,
        violationType: 'TAB_SWITCH',
        details: `Candidate switched tab / minimized window (Switch #${tabSwitchCount}).`,
        severity
      });
    } else {
      config.onWarning?.(`⚠️ Tab switch detected! (Violation #${tabSwitchCount}). Exam activity is monitored.`);
    }
  };

  const handleBlur = () => {
    const info = config.getContestInfo();
    if (!info.isRunning) return;
    logRealViolation({
      contestId: info.contestId,
      contestTitle: info.contestTitle,
      violationType: 'TAB_SWITCH',
      details: 'Navigated away from assessment window (Window blur detected).',
      severity: tabSwitchCount >= 2 ? 'high' : 'warning'
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const info = config.getContestInfo();
    if (!info.isRunning) return;

    // Detect F12
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      config.onWarning?.('Developer Tools and Inspect are disabled during assessment.');
      logRealViolation({
        contestId: info.contestId,
        contestTitle: info.contestTitle,
        violationType: 'DEVTOOLS_INSPECT',
        details: 'F12 Developer Tools key shortcut intercepted.',
        severity: 'critical'
      });
      return;
    }

    // Detect Ctrl+Shift+I / Cmd+Opt+I (DevTools Inspect)
    const isDevToolsCombo =
      (e.ctrlKey || e.metaKey) &&
      (e.shiftKey || e.altKey) &&
      ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key);

    if (isDevToolsCombo) {
      e.preventDefault();
      e.stopPropagation();
      config.onWarning?.('Developer Tools and Inspect are disabled during assessment.');
      logRealViolation({
        contestId: info.contestId,
        contestTitle: info.contestTitle,
        violationType: 'DEVTOOLS_INSPECT',
        details: `DevTools inspection shortcut intercepted (${e.key}).`,
        severity: 'critical'
      });
      return;
    }

    // Prohibit copy / cut / paste if not allowed
    if (!config.allowCopyPaste) {
      const isCopy = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C');
      const isCut = (e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X');
      const isPaste = (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V');

      if (isCopy) {
        e.preventDefault();
        config.onWarning?.('Copying content is disabled during the assessment.');
        logRealViolation({
          contestId: info.contestId,
          contestTitle: info.contestTitle,
          violationType: 'CLIPBOARD_COPY',
          details: 'Keyboard shortcut (Ctrl/Cmd+C) intercepted.',
          severity: 'warning'
        });
        return;
      }
      if (isCut) {
        e.preventDefault();
        config.onWarning?.('Cutting content is disabled during the assessment.');
        logRealViolation({
          contestId: info.contestId,
          contestTitle: info.contestTitle,
          violationType: 'CLIPBOARD_CUT',
          details: 'Keyboard shortcut (Ctrl/Cmd+X) intercepted.',
          severity: 'warning'
        });
        return;
      }
      if (isPaste) {
        e.preventDefault();
        config.onWarning?.('Pasting external content is prohibited during the assessment.');
        logRealViolation({
          contestId: info.contestId,
          contestTitle: info.contestTitle,
          violationType: 'CLIPBOARD_PASTE',
          details: 'Keyboard shortcut (Ctrl/Cmd+V) intercepted.',
          severity: 'high'
        });
        return;
      }
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    const info = config.getContestInfo();
    if (!info.isRunning) return;
    e.preventDefault();
    config.onWarning?.('Right-click context menu and inspect are disabled.');
    logRealViolation({
      contestId: info.contestId,
      contestTitle: info.contestTitle,
      violationType: 'CONTEXT_MENU',
      details: 'Right-click context menu / inspect attempted.',
      severity: 'warning'
    });
  };

  const handleCopy = (e: ClipboardEvent) => {
    const info = config.getContestInfo();
    if (!info.isRunning || config.allowCopyPaste) return;
    e.preventDefault();
    config.onWarning?.('Copying is prohibited during the assessment.');
    logRealViolation({
      contestId: info.contestId,
      contestTitle: info.contestTitle,
      violationType: 'CLIPBOARD_COPY',
      details: 'Global clipboard copy attempt intercepted.',
      severity: 'warning'
    });
  };

  const handleCut = (e: ClipboardEvent) => {
    const info = config.getContestInfo();
    if (!info.isRunning || config.allowCopyPaste) return;
    e.preventDefault();
    config.onWarning?.('Cutting is prohibited during the assessment.');
    logRealViolation({
      contestId: info.contestId,
      contestTitle: info.contestTitle,
      violationType: 'CLIPBOARD_CUT',
      details: 'Global clipboard cut attempt intercepted.',
      severity: 'warning'
    });
  };

  const handlePaste = (e: ClipboardEvent) => {
    const info = config.getContestInfo();
    if (!info.isRunning || config.allowCopyPaste) return;
    e.preventDefault();
    config.onWarning?.('Pasting external content is prohibited.');
    logRealViolation({
      contestId: info.contestId,
      contestTitle: info.contestTitle,
      violationType: 'CLIPBOARD_PASTE',
      details: 'Global clipboard paste attempt intercepted.',
      severity: 'high'
    });
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('copy', handleCopy, true);
  document.addEventListener('cut', handleCut, true);
  document.addEventListener('paste', handlePaste, true);

  return function detach() {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('contextmenu', handleContextMenu, true);
    document.removeEventListener('copy', handleCopy, true);
    document.removeEventListener('cut', handleCut, true);
    document.removeEventListener('paste', handlePaste, true);
  };
}
