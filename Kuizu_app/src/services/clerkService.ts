import './supabaseApiBridge';
import { Clerk } from '@clerk/clerk-js';
import { sendWelcomeEmail } from './resendEmailService';

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

  localStorage.setItem('kuizu_user_name', displayName);
  localStorage.setItem('kuizu_user_email', email);
  if (user.imageUrl) {
    localStorage.setItem('kuizu_user_avatar', user.imageUrl);
  }
  localStorage.setItem('kuizu_logged_in', 'true');

  // Trigger Welcome Email via Resend if user is newly registered (within last 30 minutes)
  if (email) {
    const welcomeKey = `kuizu_welcome_sent_${email.toLowerCase().trim()}`;
    if (!localStorage.getItem(welcomeKey)) {
      const createdTime = user.createdAt ? new Date(user.createdAt).getTime() : 0;
      const isNewUser = (Date.now() - createdTime) < (30 * 60 * 1000); // Created within last 30 minutes
      if (isNewUser) {
        localStorage.setItem(welcomeKey, 'true');
        sendWelcomeEmail(email, displayName);
      }
    }
  }

  // Asynchronously register / update user in Bun SQLite DB
  if (email) {
    const isAdmin = email.toLowerCase() === 'anujschavan007@gmail.com';
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id || undefined,
        name: displayName,
        email: email,
        avatar: user.imageUrl || '',
        role: isAdmin ? 'Admin' : 'Student'
      })
    }).catch(err => console.warn('Could not sync user to Bun backend:', err));
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
