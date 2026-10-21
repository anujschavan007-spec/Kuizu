/**
 * Mandatory User Authentication Guard for KUIZU
 * Protects all application routes and ensures only authenticated Clerk sessions can access app pages.
 * Redirects unauthenticated visitors to /sign-in immediately.
 */

import { getClerk, syncClerkUserToLocalStorage } from './clerkService';

// Public routes that never require authentication
const PUBLIC_PATHS = [
  '/',
  '/index.html',
  '/sign-in',
  '/sign-in/',
  '/sign-in/index.html',
  '/sign-up',
  '/sign-up/',
  '/sign-up/index.html',
  '/sso-callback',
  '/sso-callback/',
  '/sso-callback/index.html'
];

export function isPublicPath(pathname: string): boolean {
  const clean = pathname.toLowerCase();
  if (!clean || clean === '/' || clean === '/index.html') return true;
  return PUBLIC_PATHS.some(p => clean === p || clean.replace(/\/$/, '') === p.replace(/\/$/, '')) || clean.startsWith('/api/');
}

/**
 * Enforces mandatory authentication on the current page
 */
export async function enforceAuthGuard(): Promise<any> {
  if (typeof window === 'undefined') return null;

  const currentPath = window.location.pathname.toLowerCase();

  // If on public marketing landing page or auth pages
  if (isPublicPath(currentPath)) {
    // If user is on /sign-in or /sign-up and is already authenticated, send them to /home
    if (currentPath.includes('/sign-in') || currentPath.includes('/sign-up')) {
      const isLocallyLoggedIn = localStorage.getItem('kuizu_logged_in') === 'true' && localStorage.getItem('kuizu_user_email');
      if (isLocallyLoggedIn) {
        try {
          const clerk = await getClerk();
          if (clerk.user) {
            const redirectUrl = sessionStorage.getItem('kuizu_redirect_after_login') || '/home';
            sessionStorage.removeItem('kuizu_redirect_after_login');
            window.location.replace(redirectUrl);
            return clerk.user;
          }
        } catch (_) {}
      }
    }
    return null;
  }

  // FAST PATH: If no local session flag, immediately redirect before waiting for network
  const hasLocalFlag = localStorage.getItem('kuizu_logged_in') === 'true' && localStorage.getItem('kuizu_user_email');
  if (!hasLocalFlag) {
    sessionStorage.setItem('kuizu_redirect_after_login', window.location.pathname + window.location.search);
    window.location.replace('/sign-in');
    return null;
  }

  // ACCURATE PATH: Verify Clerk session with backend
  try {
    const clerk = await getClerk();
    if (clerk.user) {
      // User is authenticated!
      syncClerkUserToLocalStorage(clerk.user);
      return clerk.user;
    } else {
      // Session has expired or user logged out!
      console.warn('[authGuard] No active Clerk session found. Redirecting to /sign-in...');
      localStorage.removeItem('kuizu_logged_in');
      localStorage.removeItem('kuizu_user_email');
      localStorage.removeItem('kuizu_user_name');
      localStorage.removeItem('kuizu_user_avatar');
      localStorage.removeItem('kuizu_user_profile');
      sessionStorage.setItem('kuizu_redirect_after_login', window.location.pathname + window.location.search);
      window.location.replace('/sign-in');
      return null;
    }
  } catch (err) {
    console.warn('[authGuard] Clerk verification error:', err);
    // If Clerk check fails but we have a valid local session, allow temporary offline grace
    if (!hasLocalFlag) {
      window.location.replace('/sign-in');
    }
    return null;
  }
}

// Auto-run guard on module import
if (typeof window !== 'undefined') {
  enforceAuthGuard();
}
