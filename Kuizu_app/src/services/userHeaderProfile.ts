/**
 * Single Unified User Header Profile & Dropdown Manager for KUIZU
 * Synchronizes authenticated user identity, avatar, XP, streak, and header dropdown
 * identically across all pages (Home, Problems, Quiz, Battle, Contests, Quests, etc.).
 */

import { initClerkUserSync, signOutClerk } from './clerkService';
import './authGuard';
import { syncAdminProfileMenu, isAuthorizedAdmin } from './adminAuthGuard';
import { toggleTheme } from '../theme';
import { isAddedUserAvatar } from './avatarStorage';

export interface UserHeaderData {
  name: string;
  email: string;
  avatar: string;
  xp: number;
  streak: number;
  rank?: string;
  isAdmin: boolean;
}

// Current memory state
let currentProfile: UserHeaderData = {
  name: localStorage.getItem('kuizu_user_name') || 'Anuj Chavan',
  email: localStorage.getItem('kuizu_user_email') || 'anujschavan007@gmail.com',
  avatar: localStorage.getItem('kuizu_user_avatar') || '/images/home_avatar.png',
  xp: Number(localStorage.getItem('kuizu_user_xp')) || 0,
  streak: Number(localStorage.getItem('kuizu_user_streak')) || 0,
  isAdmin: false
};

/**
 * Update all DOM elements representing user profile in header and dropdown
 */
export function updateHeaderDOM(data: Partial<UserHeaderData>) {
  if (data.name !== undefined) {
    currentProfile.name = data.name;
    const nameEls = document.querySelectorAll<HTMLElement>('#menu-user-name, .popup-user-name');
    nameEls.forEach(el => {
      el.textContent = currentProfile.name;
    });

    const homeGreetingEl = document.getElementById('home-greeting');
    if (homeGreetingEl) {
      homeGreetingEl.textContent = `Hi, ${currentProfile.name.split(' ')[0] || currentProfile.name}`;
    }
  }

  if (data.xp !== undefined) {
    currentProfile.xp = Number(data.xp) || 0;
    const formattedXp = `${currentProfile.xp.toLocaleString()} XP`;

    const xpEls = document.querySelectorAll<HTMLElement>('#menu-user-xp, .popup-xp-text');
    xpEls.forEach(el => {
      el.textContent = formattedXp;
    });

    const pillXpVal = document.getElementById('pill-xp-val');
    if (pillXpVal) {
      pillXpVal.textContent = formattedXp;
    }
    const pillXpMetric = document.querySelector('#pill-xp .metric-val');
    if (pillXpMetric) {
      pillXpMetric.textContent = formattedXp;
    }
  }

  if (data.streak !== undefined) {
    currentProfile.streak = Number(data.streak) || 0;
    const streakFormatted = `${currentProfile.streak} Days`;

    const pillStreakVal = document.getElementById('pill-streak-val');
    if (pillStreakVal) {
      pillStreakVal.textContent = streakFormatted;
    }
    const pillStreakMetric = document.querySelector('#pill-streak .metric-val');
    if (pillStreakMetric) {
      pillStreakMetric.textContent = streakFormatted;
    }
  }

  if (data.avatar) {
    currentProfile.avatar = data.avatar;
    const currentEmail = data.email || currentProfile.email || localStorage.getItem('kuizu_user_email') || '';
    const isAdmin = isAuthorizedAdmin(currentEmail);

    const userFacingSelectors = [
      '.popup-avatar-img',
      '.user-nav-avatar',
      '#btn-user-avatar img',
      '.profile-avatar-img',
      '.profile-hero-avatar',
      '.home-user-avatar',
      '#active-avatar-preview-img',
      '.settings-avatar-img',
      '#modal-preview-avatar'
    ];

    const adminFacingSelectors = [
      '#sidebar-admin-avatar-img',
      '#admin-account-avatar-preview',
      '.admin-avatar-circle img',
      '.admin-profile-modal-avatar'
    ];

    const selectors = isAdmin
      ? [...userFacingSelectors, ...adminFacingSelectors]
      : userFacingSelectors;

    const avatarImgs = document.querySelectorAll<HTMLImageElement>(selectors.join(', '));
    avatarImgs.forEach(img => {
      if (img.src !== currentProfile.avatar) {
        img.src = currentProfile.avatar;
      }
    });
  }

  if (data.email !== undefined) {
    currentProfile.email = data.email;
    currentProfile.isAdmin = isAuthorizedAdmin(currentProfile.email);
  }

  // Ensure admin button visibility matches
  syncAdminProfileMenu();
}

/**
 * Fetch and sync latest user data from /api/users Supabase DB
 */
export async function syncUserDataWithAPI(): Promise<UserHeaderData> {
  const storedEmail = localStorage.getItem('kuizu_user_email') || currentProfile.email;
  const storedName = localStorage.getItem('kuizu_user_name') || currentProfile.name;

  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      const users: any[] = data.users || [];

      // Find user strictly by email match or name match
      let matched = users.find((u: any) =>
        (storedEmail && u.email && u.email.toLowerCase().trim() === storedEmail.toLowerCase().trim()) ||
        (storedName && u.name && u.name.toLowerCase().trim() === storedName.toLowerCase().trim())
      );

      // If still not matched, check if Anuj is the intended default or take users[0]
      if (!matched) {
        matched = users.find((u: any) => u.email && u.email.toLowerCase() === 'anujschavan007@gmail.com') || users[0];
      }

      if (matched) {
        const xp = Number(matched.xp) || 0;
        const streak = Math.max(0, Number(matched.streak) || 0);
        const name = matched.name || storedName || 'Anuj Chavan';
        const email = matched.email || storedEmail || 'anujschavan007@gmail.com';
        // Check if user has an added or custom avatar in Supabase (Pixar preset, 3D GLB, custom photo)
        const hasCustomAvatar = Boolean(matched.custom_avatar || (matched.avatar && isAddedUserAvatar(matched.avatar)));

        let avatar: string;
        if (hasCustomAvatar) {
          // User explicitly added or changed their profile image: ALWAYS fetch and display it!
          avatar = matched.custom_avatar || matched.avatar;
          localStorage.setItem('kuizu_custom_avatar', avatar);
          localStorage.setItem('kuizu_custom_avatar_saved', 'true');
        } else {
          // If no avatar added: simply keep Google fetched profile!
          avatar = matched.google_avatar || localStorage.getItem('kuizu_google_avatar') || matched.avatar || localStorage.getItem('kuizu_user_avatar') || currentProfile.avatar || '/images/home_avatar.png';
          localStorage.removeItem('kuizu_custom_avatar');
          localStorage.removeItem('kuizu_custom_avatar_saved');
        }

        if (matched.google_avatar) {
          localStorage.setItem('kuizu_google_avatar', matched.google_avatar);
        }

        if (matched.avatar_mode === '3d' && matched.avatar_glb_url) {
          localStorage.setItem('kuizu_avatar_mode', '3d');
          localStorage.setItem('kuizu_avatar_glb_url', matched.avatar_glb_url);
          if (matched.avatar_glb_mode) {
            localStorage.setItem('kuizu_avatar_glb_mode', matched.avatar_glb_mode);
          }
        } else if (matched.avatar_mode === '2d') {
          localStorage.setItem('kuizu_avatar_mode', '2d');
          localStorage.removeItem('kuizu_avatar_glb_url');
          localStorage.removeItem('kuizu_avatar_glb_mode');
        }

        localStorage.setItem('kuizu_user_name', name);
        localStorage.setItem('kuizu_user_email', email);
        localStorage.setItem('kuizu_user_xp', String(xp));
        localStorage.setItem('kuizu_user_streak', String(streak));
        localStorage.setItem('kuizu_user_avatar', avatar);

        updateHeaderDOM({
          name,
          email,
          avatar,
          xp,
          streak,
          rank: matched.rank,
          isAdmin: isAuthorizedAdmin(email)
        });

        return currentProfile;
      }
    }
  } catch (err) {
    console.warn('[userHeaderProfile] API sync fallback:', err);
  }

  return currentProfile;
}

/**
 * Wires up all event listeners for the header avatar and dropdown popup
 */
export function setupDropdownInteractions() {
  const btnAvatar = document.getElementById('btn-user-avatar');
  const userDropdown = document.getElementById('user-dropdown');

  if (btnAvatar && userDropdown) {
    // Avoid double attaching
    if (!(btnAvatar as any).__hasDropdownListener) {
      (btnAvatar as any).__hasDropdownListener = true;

      btnAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = userDropdown.classList.contains('show');
        userDropdown.classList.toggle('show', !isOpen);
        btnAvatar.classList.toggle('open', !isOpen);
        btnAvatar.setAttribute('aria-expanded', String(!isOpen));
      });

      document.addEventListener('click', (e) => {
        if (!userDropdown.contains(e.target as Node) && !btnAvatar.contains(e.target as Node)) {
          userDropdown.classList.remove('show');
          btnAvatar.classList.remove('open');
          btnAvatar.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && userDropdown.classList.contains('show')) {
          userDropdown.classList.remove('show');
          btnAvatar.classList.remove('open');
          btnAvatar.setAttribute('aria-expanded', 'false');
        }
      });

      if (window.location.hash === '#open-popup') {
        userDropdown.classList.add('show');
        btnAvatar.classList.add('open');
        btnAvatar.setAttribute('aria-expanded', 'true');
      }
    }
  }

  // Header click -> /profile
  const popupUserHeader = document.querySelector('.popup-user-header');
  if (popupUserHeader && !(popupUserHeader as any).__hasClickListener) {
    (popupUserHeader as any).__hasClickListener = true;
    popupUserHeader.addEventListener('click', () => {
      window.location.href = '/profile';
    });
  }

  // 1. Leaderboard -> /problem/mainleaderboard
  const btnLeaderboard = document.getElementById('btn-menu-leaderboard');
  if (btnLeaderboard && !(btnLeaderboard as any).__hasClickListener) {
    (btnLeaderboard as any).__hasClickListener = true;
    btnLeaderboard.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/problem/mainleaderboard';
    });
  }

  // 2. Theme -> toggleTheme()
  const btnTheme = document.getElementById('btn-menu-theme');
  if (btnTheme && !(btnTheme as any).__hasClickListener) {
    (btnTheme as any).__hasClickListener = true;
    btnTheme.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newTheme = toggleTheme();
      showToast(`Switched to ${newTheme.toUpperCase()} theme`);
    });
  }

  // 3. 3D Avatar Studio -> /avatar
  const btnAvatarStudio = document.getElementById('btn-menu-avatar');
  if (btnAvatarStudio && !(btnAvatarStudio as any).__hasClickListener) {
    (btnAvatarStudio as any).__hasClickListener = true;
    btnAvatarStudio.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/addavatar';
    });
  }

  // 4. Settings -> /settings
  const btnSettings = document.getElementById('btn-menu-settings');
  if (btnSettings && !(btnSettings as any).__hasClickListener) {
    (btnSettings as any).__hasClickListener = true;
    btnSettings.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/settings';
    });
  }

  // 5. Admin -> /admin
  const btnAdmin = document.getElementById('btn-menu-admin');
  if (btnAdmin && !(btnAdmin as any).__hasClickListener) {
    (btnAdmin as any).__hasClickListener = true;
    btnAdmin.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/admin';
    });
  }

  // 6. Logout -> Clerk SignOut
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout && !(btnLogout as any).__hasClickListener) {
    (btnLogout as any).__hasClickListener = true;
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      await signOutClerk();
    });
  }
}

/**
 * Toast helper for header interactions
 */
function showToast(message: string) {
  let toast = document.getElementById('kuizu-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kuizu-toast';
    toast.className = 'toast-notice';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span style="font-weight: 500;">${message}</span>`;
  toast.classList.add('show');
  setTimeout(() => {
    toast?.classList.remove('show');
  }, 2500);
}

/**
 * Master initializer: Call on any page
 */
export function initUserHeaderProfile() {
  // 1. Immediately apply cached state to eliminate any visual delay or wrong data
  const cachedName = localStorage.getItem('kuizu_user_name');
  const cachedEmail = localStorage.getItem('kuizu_user_email');
  const cachedXp = localStorage.getItem('kuizu_user_xp');
  const cachedStreak = localStorage.getItem('kuizu_user_streak');
  const cachedAvatar = localStorage.getItem('kuizu_user_avatar');

  updateHeaderDOM({
    name: cachedName || currentProfile.name,
    email: cachedEmail || currentProfile.email,
    xp: cachedXp ? Number(cachedXp) : currentProfile.xp,
    streak: cachedStreak ? Number(cachedStreak) : currentProfile.streak,
    avatar: cachedAvatar || currentProfile.avatar
  });

  // 2. Setup interactive events
  setupDropdownInteractions();

  // 3. Keep Clerk in sync
  initClerkUserSync().then((user) => {
    if (user) {
      const email = user.primaryEmailAddress?.emailAddress;
      const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const currentStoredAvatar = localStorage.getItem('kuizu_user_avatar');
      const isCustomSaved = localStorage.getItem('kuizu_custom_avatar_saved') === 'true';
      const hasCustom = isCustomSaved && isAddedUserAvatar(currentStoredAvatar);
      const avatarToUse = (hasCustom ? currentStoredAvatar : (user.imageUrl || cachedAvatar || currentProfile.avatar)) || '/images/home_avatar.png';
      if (email || fullName) {
        updateHeaderDOM({
          name: fullName || cachedName || currentProfile.name,
          email: email || cachedEmail || currentProfile.email,
          avatar: avatarToUse
        });
      }
    }
    // 4. Fetch live XP and details from DB
    syncUserDataWithAPI();
  }).catch(() => {
    syncUserDataWithAPI();
  });
}

// Listen to storage and custom events to update header dynamically if avatar or user changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'kuizu_user_xp' || e.key === 'kuizu_user_name' || e.key === 'kuizu_user_avatar') {
      updateHeaderDOM({
        name: localStorage.getItem('kuizu_user_name') || currentProfile.name,
        xp: Number(localStorage.getItem('kuizu_user_xp')) || currentProfile.xp,
        avatar: localStorage.getItem('kuizu_user_avatar') || currentProfile.avatar
      });
    }
  });

  // Custom event when avatar is changed via 3D Avatar Studio
  window.addEventListener('kuizu:avatar_changed', (e: any) => {
    const newAvatar = e.detail?.avatarUrl || localStorage.getItem('kuizu_user_avatar');
    if (newAvatar) {
      updateHeaderDOM({ avatar: newAvatar });
    }
  });

  // Custom event when XP is awarded locally in quizzes, problems, battles
  window.addEventListener('kuizu:xp-updated', (e: any) => {
    if (e.detail?.xp !== undefined) {
      localStorage.setItem('kuizu_user_xp', String(e.detail.xp));
      updateHeaderDOM({ xp: Number(e.detail.xp) });
    }
  });
}

// Auto-initialize when loaded
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initUserHeaderProfile());
  } else {
    initUserHeaderProfile();
  }
}
