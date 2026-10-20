import { getClerk, syncClerkUserToLocalStorage, signOutClerk } from './clerkService';

export const AUTHORIZED_ADMIN_EMAIL = 'anujschavan007@gmail.com';

/**
 * Checks if a given email is the authorized admin email (case-insensitive & trimmed)
 */
export function isAuthorizedAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();
}

/**
 * Returns current logged-in user email from localStorage
 */
export function getCurrentUserEmail(): string | null {
  return localStorage.getItem('kuizu_user_email');
}

/**
 * Renders a normal Access Denied text in the centre of the page and hides all admin elements
 */
export function renderAccessDenied(_currentUserEmail?: string | null) {
  // Hide all existing admin layout
  const adminLayouts = document.querySelectorAll<HTMLElement>('.admin-layout, .admin-container, aside.admin-sidebar, main.admin-main');
  adminLayouts.forEach(el => el.style.setProperty('display', 'none', 'important'));

  // Remove existing access denied container if present
  let deniedContainer = document.getElementById('admin-access-denied-screen');
  if (deniedContainer) {
    deniedContainer.remove();
  }

  const html = `
    <div id="admin-access-denied-screen" class="normal-access-denied-screen">
      <div class="normal-access-denied-box">
        <h1 class="normal-access-denied-heading">Access Denied</h1>
        <p class="normal-access-denied-subtext">You do not have permission to access this page.</p>
        <a href="/home" class="normal-access-denied-btn">Back to Home</a>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Main Guard Function: Validates current session against AUTHORIZED_ADMIN_EMAIL
 */
export async function enforceAdminGuard() {
  const localEmail = getCurrentUserEmail();

  // If local email matches admin, show immediately to prevent flicker
  if (isAuthorizedAdmin(localEmail)) {
    // Keep Clerk in sync in background
    try {
      const clerk = await getClerk();
      if (clerk.user) {
        syncClerkUserToLocalStorage(clerk.user);
        const clerkEmail = clerk.user.primaryEmailAddress?.emailAddress;
        if (!isAuthorizedAdmin(clerkEmail)) {
          renderAccessDenied(clerkEmail);
          return false;
        }
      }
    } catch (_) {}
    return true;
  }

  // If local email doesn't match or is missing, check Clerk
  try {
    const clerk = await getClerk();
    if (clerk.user) {
      syncClerkUserToLocalStorage(clerk.user);
      const clerkEmail = clerk.user.primaryEmailAddress?.emailAddress;
      if (isAuthorizedAdmin(clerkEmail)) {
        return true;
      } else {
        renderAccessDenied(clerkEmail);
        return false;
      }
    }
  } catch (_) {}

  // Not logged in or not admin
  renderAccessDenied(localEmail);
  return false;
}

/**
 * Strict Guard for Profile Menu Admin Button:
 * Checks if current logged-in user email is strictly anujschavan007@gmail.com.
 * IF YES: Displays the Admin Panel button in all profile dropdown menus.
 * IF NO: Strictly ensures NO admin button or text is visible (hidden with display:none !important and removed from DOM).
 */
export function syncAdminProfileMenu(): void {
  const currentEmail = getCurrentUserEmail();
  const isAdmin = isAuthorizedAdmin(currentEmail);

  // Find all admin buttons across any profile menus
  const adminBtns = document.querySelectorAll<HTMLElement>('#btn-menu-admin, .popup-menu-admin');

  if (isAdmin) {
    // If buttons already exist in HTML, display them
    adminBtns.forEach(btn => {
      btn.style.setProperty('display', 'flex', 'important');
    });

    // Check all .popup-menu-list elements to ensure they have the admin button
    const menuLists = document.querySelectorAll<HTMLElement>('.popup-menu-list');
    menuLists.forEach(list => {
      if (!list.querySelector('#btn-menu-admin, .popup-menu-admin')) {
        const item = document.createElement('a');
        item.href = '/admin';
        item.id = 'btn-menu-admin';
        item.className = 'popup-menu-item popup-menu-admin';
        item.style.setProperty('display', 'flex', 'important');
        item.innerHTML = `
          <div class="menu-item-left">
            <svg class="menu-icon admin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <rect x="9" y="11" width="6" height="5" rx="1"></rect>
              <path d="M10 11V9a2 2 0 1 1 4 0v2"></path>
            </svg>
            <span>Admin Panel</span>
          </div>
          <span class="menu-item-chevron">›</span>
        `;
        const settingsBtn = list.querySelector('#btn-menu-settings, #btn-compiler-menu-settings');
        if (settingsBtn && settingsBtn.nextSibling) {
          list.insertBefore(item, settingsBtn.nextSibling);
        } else {
          list.appendChild(item);
        }
      }
    });
  } else {
    // STRICT: remove all admin buttons completely from DOM so nothing about admin panel is visible or inspectable
    adminBtns.forEach(btn => {
      btn.remove();
    });
  }
}

/**
 * Initializes and continuously validates admin menu access
 */
export async function initAdminMenuGuard(): Promise<void> {
  // 1. Synchronous check with cached state
  syncAdminProfileMenu();

  // 2. Validate with Clerk in background
  try {
    const clerk = await getClerk();
    if (clerk.user) {
      syncClerkUserToLocalStorage(clerk.user);
    }
    syncAdminProfileMenu();

    clerk.addListener?.(() => {
      if (clerk.user) {
        syncClerkUserToLocalStorage(clerk.user);
      }
      syncAdminProfileMenu();
    });
  } catch (_) {
    syncAdminProfileMenu();
  }
}

// Automatically enforce guards on all pages
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.location.pathname.startsWith('/admin')) {
        enforceAdminGuard();
      }
      initAdminMenuGuard();
    });
  } else {
    if (window.location.pathname.startsWith('/admin')) {
      enforceAdminGuard();
    }
    initAdminMenuGuard();
  }
}
