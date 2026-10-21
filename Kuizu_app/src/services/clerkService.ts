import './supabaseApiBridge';
import { Clerk } from '@clerk/clerk-js';
import { sendWelcomeEmail } from './resendEmailService';
import { isAddedUserAvatar } from './avatarStorage';

export const CLERK_PUBLISHABLE_KEY =
  (import.meta as any).env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY ||
  'pk_test_Zmx1ZW50LWFudGVhdGVyLTI5NjUuY2xlcmsuYWNjb3VudHMuZGV2JA';

let clerkInstance: Clerk | null = null;
let clerkLoadPromise: Promise<Clerk> | null = null;

/**
 * Singleton Clerk instance loader
 */
export async function getClerk(): Promise<Clerk> {
  if (clerkInstance && clerkInstance.loaded) {
    return clerkInstance;
  }
  if (clerkLoadPromise) {
    return clerkLoadPromise;
  }

  clerkLoadPromise = (async () => {
    const clerk = new Clerk(CLERK_PUBLISHABLE_KEY);
    await clerk.load();
    clerkInstance = clerk;
    return clerk;
  })();

  return clerkLoadPromise;
}

/**
 * Sync Clerk User details to localStorage so existing pages display the real authenticated user
 */
export function syncClerkUserToLocalStorage(user: any) {
  if (!user) return;
  const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const email = user.primaryEmailAddress?.emailAddress || '';
  const emailPrefix = email ? email.split('@')[0] : '';
  const displayName = fullName || (emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : 'Kuizu Learner');

  // Purge stale profile cache if switching to a different user account
  const prevEmail = localStorage.getItem('kuizu_user_email');
  if (prevEmail && email && prevEmail.toLowerCase() !== email.toLowerCase()) {
    console.log('[auth] Account switch detected from', prevEmail, 'to', email, '- purging stale cached profile');
    localStorage.removeItem('kuizu_user_profile');
    localStorage.removeItem('kuizu_user_xp');
    localStorage.removeItem('kuizu_user_streak');
    localStorage.removeItem('kuizu_user_avatar');
    localStorage.removeItem('kuizu_custom_avatar_saved');
    localStorage.removeItem('kuizu_completed_contests');
    localStorage.removeItem('kuizu_completed_quests');
  }

  localStorage.setItem('kuizu_user_name', displayName);
  localStorage.setItem('kuizu_user_email', email);
  if (user.imageUrl) {
    localStorage.setItem('kuizu_google_avatar', user.imageUrl);
    const isCustomSaved = localStorage.getItem('kuizu_custom_avatar_saved') === 'true';
    const existingCustom = localStorage.getItem('kuizu_custom_avatar');
    // If user has not explicitly chosen a custom avatar, keep Google fetched profile!
    if (!isCustomSaved || !existingCustom) {
      localStorage.setItem('kuizu_user_avatar', user.imageUrl);
    }
  }
  localStorage.setItem('kuizu_logged_in', 'true');

  // Trigger Welcome Email if user is newly registered (within last 24 hours or first signup session)
  if (email) {
    const welcomeKey = `kuizu_welcome_sent_${email.toLowerCase().trim()}`;
    if (!localStorage.getItem(welcomeKey)) {
      const createdTime = user.createdAt ? new Date(user.createdAt).getTime() : 0;
      const isNewUser = !createdTime || (Date.now() - createdTime) < (24 * 60 * 60 * 1000);
      if (isNewUser) {
        sendWelcomeEmail(email, displayName).then((sent) => {
          if (sent) {
            localStorage.setItem(welcomeKey, 'true');
          }
        }).catch(e => console.warn('Welcome email error:', e));
      }
    }
  }

  // Asynchronously register / update user in DB and fetch user's saved avatar
  if (email) {
    const isAdmin = email.toLowerCase() === 'anujschavan007@gmail.com';
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id || undefined,
        name: displayName,
        email: email,
        googleAvatar: user.imageUrl || '',
        isAuthSync: true,
        role: isAdmin ? 'Admin' : 'Student'
      })
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        const dbUser = data.user;
        if (dbUser) {
          if (dbUser.google_avatar) {
            localStorage.setItem('kuizu_google_avatar', dbUser.google_avatar);
          }

          if (dbUser.avatar_mode === '3d' && dbUser.avatar_glb_url) {
            localStorage.setItem('kuizu_avatar_mode', '3d');
            localStorage.setItem('kuizu_avatar_glb_url', dbUser.avatar_glb_url);
            if (dbUser.avatar_glb_mode) {
              localStorage.setItem('kuizu_avatar_glb_mode', dbUser.avatar_glb_mode);
            }
          } else if (dbUser.avatar_mode === '2d') {
            localStorage.setItem('kuizu_avatar_mode', '2d');
            localStorage.removeItem('kuizu_avatar_glb_url');
            localStorage.removeItem('kuizu_avatar_glb_mode');
          }

          // Check if user has an added or saved custom avatar in Supabase:
          const hasCustomAvatar = Boolean(dbUser.custom_avatar || (dbUser.avatar && isAddedUserAvatar(dbUser.avatar)));
          let finalAvatar: string;

          if (hasCustomAvatar) {
            // User explicitly changed their profile image: ALWAYS fetch and update it!
            finalAvatar = dbUser.custom_avatar || dbUser.avatar;
            localStorage.setItem('kuizu_custom_avatar', finalAvatar);
            localStorage.setItem('kuizu_custom_avatar_saved', 'true');
          } else {
            // If not changed: simply keep Google fetched profile!
            finalAvatar = user.imageUrl || dbUser.google_avatar || dbUser.avatar || '/images/home_avatar.png';
            localStorage.removeItem('kuizu_custom_avatar');
            localStorage.removeItem('kuizu_custom_avatar_saved');
          }

          localStorage.setItem('kuizu_user_avatar', finalAvatar);
          window.dispatchEvent(
            new CustomEvent('kuizu:avatar_changed', {
              detail: {
                avatarUrl: finalAvatar,
                mode: dbUser.avatar_mode || '2d',
                glbUrl: dbUser.avatar_glb_url || ''
              }
            })
          );
        }
      }
    }).catch(err => console.warn('Could not sync user to backend:', err));
  }
}

/**
 * Call on page load to sync authenticated user or maintain session
 */
export async function initClerkUserSync() {
  try {
    const clerk = await getClerk();
    if (clerk.user) {
      syncClerkUserToLocalStorage(clerk.user);
      return clerk.user;
    }
  } catch (err) {
    console.warn('Clerk user sync error:', err);
  }
  return null;
}

/**
 * Sign out of Clerk and clear local session state
 */
export async function signOutClerk() {
  localStorage.removeItem('kuizu_user_name');
  localStorage.removeItem('kuizu_user_email');
  localStorage.removeItem('kuizu_user_avatar');
  localStorage.removeItem('kuizu_logged_in');
  try {
    const clerk = await getClerk();
    if (clerk.session) {
      await clerk.signOut();
    }
  } catch (err) {
    console.warn('Sign out error:', err);
  }
  window.location.href = '/sign-in';
}
