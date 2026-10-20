/**
 * KUIZU User Profile Logic
 */
import { signOutClerk, initClerkUserSync } from './services/clerkService';
import './services/adminAuthGuard';

interface UserProfileData {
  name: string;
  email: string;
  studentId: string;
  rank: string;
  xp: string;
  streak: string;
  attendancePercent: number;
  classesAttended: number;
  totalClasses: number;
  classwork: { completed: number; total: number };
  homework: { completed: number; total: number };
  leetcodeSolved: number;
  quizLevel: number;
  problemsSolved: number;
  dailyKuizuActive: boolean;
}

const DEFAULT_PROFILE: UserProfileData = {
  name: 'Anuj Chavan',
  email: 'anujschavan007@gmail.com',
  studentId: 'STU00123',
  rank: '#1',
  xp: '0',
  streak: '0 days',
  attendancePercent: 100,
  classesAttended: 0,
  totalClasses: 50,
  classwork: { completed: 0, total: 20 },
  homework: { completed: 0, total: 20 },
  leetcodeSolved: 0,
  quizLevel: 1,
  problemsSolved: 0,
  dailyKuizuActive: true
};

const PROFILE_STORAGE_KEY = 'kuizu_user_profile';

function loadProfileData(): UserProfileData {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to parse stored profile:', e);
  }
  return DEFAULT_PROFILE;
}

function saveProfileData(data: UserProfileData): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem('kuizu_user_name', data.name);
  } catch (e) {
    console.warn('Failed to save profile:', e);
  }
}

// Global Toast System without emojis
function showToast(message: string): void {
  const existing = document.querySelector('.settings-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'settings-toast';
  toast.innerHTML = `<span class="toast-text">${message}</span>`;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}

document.addEventListener('DOMContentLoaded', () => {
  let profile = loadProfileData();

  // Elements
  const elName = document.getElementById('profile-user-name');
  const elEmail = document.getElementById('profile-user-email');
  const elId = document.getElementById('profile-user-id');
  const elRank = document.getElementById('profile-stat-rank');
  const elXp = document.getElementById('profile-stat-xp');
  const elStreak = document.getElementById('profile-stat-streak');
  const elAttPercent = document.getElementById('profile-att-percent');
  const elAttCount = document.getElementById('profile-att-count');
  const elProgressCircle = document.getElementById('progress-ring-circle') as SVGCircleElement | null;

  // Header Dropdown Elements
  const btnUserAvatar = document.getElementById('btn-user-avatar');
  const userDropdown = document.getElementById('user-dropdown');
  const menuUserName = document.getElementById('menu-user-name');
  const menuUserXp = document.getElementById('menu-user-xp');

  function renderProfile() {
    if (elName) elName.textContent = profile.name;
    if (elEmail) elEmail.textContent = profile.email;
    if (elId) elId.textContent = profile.studentId;
    if (elRank) elRank.textContent = profile.rank;
    if (elXp) elXp.textContent = profile.xp;
    if (elStreak) elStreak.textContent = profile.streak;
    if (elAttPercent) elAttPercent.textContent = `${profile.attendancePercent}%`;
    if (elAttCount) elAttCount.textContent = `${profile.classesAttended} / ${profile.totalClasses}`;

    if (menuUserName) menuUserName.textContent = profile.name;
    if (menuUserXp) menuUserXp.textContent = `${profile.xp} XP`;

    // Circular progress stroke calculation
    if (elProgressCircle) {
      const radius = elProgressCircle.r.baseVal.value;
      const circumference = 2 * Math.PI * radius;
      elProgressCircle.style.strokeDasharray = `${circumference}`;
      const offset = circumference - (profile.attendancePercent / 100) * circumference;
      elProgressCircle.style.strokeDashoffset = `${offset}`;
    }
  }

  renderProfile();

  // Dynamically sync real strictly calculated XP and rank from server
  async function syncRealProfileFromApi() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        const users: any[] = data.users || [];
        const storedEmail = localStorage.getItem('kuizu_user_email') || profile.email;
        const matched = users.find((u: any) =>
          (u.email && u.email.toLowerCase() === storedEmail.toLowerCase()) ||
          (u.name && u.name.toLowerCase() === profile.name.toLowerCase())
        ) || users[0];

        if (matched) {
          profile.name = matched.name || profile.name;
          profile.email = matched.email || profile.email;
          profile.rank = matched.rank || '#1';
          profile.xp = `${Number(matched.xp || 0).toLocaleString()}`;
          profile.streak = `${Number(matched.streak || 0)} days`;
          profile.problemsSolved = Number(matched.problems_solved || 0);
          saveProfileData(profile);
          renderProfile();
        }
      }
    } catch (err) {
      console.warn('Could not sync real profile data from API:', err);
    }
  }

  syncRealProfileFromApi();

  // User Dropdown Interaction
  if (btnUserAvatar && userDropdown) {
    btnUserAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdown.classList.contains('show');
      userDropdown.classList.toggle('show', !isOpen);
      btnUserAvatar.classList.toggle('open', !isOpen);
      btnUserAvatar.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target as Node) && !btnUserAvatar.contains(e.target as Node)) {
        userDropdown.classList.remove('show');
        btnUserAvatar.classList.remove('open');
        btnUserAvatar.setAttribute('aria-expanded', 'false');
      }
    });

    if (window.location.hash === '#open-popup') {
      userDropdown.classList.add('show');
      btnUserAvatar.classList.add('open');
      btnUserAvatar.setAttribute('aria-expanded', 'true');
    }
  }

  // Profile Popup Header Click -> Redirects to /profile
  const popupUserHeader = document.getElementById('popup-user-header-card');
  popupUserHeader?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  // Settings Link from Dropdown
  document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
    window.location.href = '/settings';
  });

  // Leaderboard Link from Dropdown
  document.getElementById('btn-menu-leaderboard')?.addEventListener('click', () => {
    window.location.href = '/problem/leaderboard';
  });

  // Theme Toggle Button
  document.getElementById('btn-menu-theme')?.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    showToast(isDark ? 'Dark theme enabled' : 'Light theme enabled');
  });

  // Edit Profile Modal Handling
  const btnEditProfile = document.getElementById('btn-edit-profile');
  const editModal = document.getElementById('edit-profile-modal');
  const btnCloseModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const editProfileForm = document.getElementById('edit-profile-form') as HTMLFormElement | null;
  const inputEditName = document.getElementById('edit-input-name') as HTMLInputElement | null;
  const inputEditEmail = document.getElementById('edit-input-email') as HTMLInputElement | null;
  const inputEditId = document.getElementById('edit-input-id') as HTMLInputElement | null;

  function openEditModal() {
    if (!editModal) return;
    if (inputEditName) inputEditName.value = profile.name;
    if (inputEditEmail) inputEditEmail.value = profile.email;
    if (inputEditId) inputEditId.value = profile.studentId;
    editModal.classList.add('open');
  }

  function closeEditModal() {
    editModal?.classList.remove('open');
  }

  btnEditProfile?.addEventListener('click', openEditModal);
  btnCloseModal?.addEventListener('click', closeEditModal);
  btnCancelEdit?.addEventListener('click', closeEditModal);

  editModal?.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });

  editProfileForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (inputEditName && inputEditEmail && inputEditId) {
      profile.name = inputEditName.value.trim() || profile.name;
      profile.email = inputEditEmail.value.trim() || profile.email;
      profile.studentId = inputEditId.value.trim() || profile.studentId;
      saveProfileData(profile);
      renderProfile();
      closeEditModal();
      showToast('Profile updated successfully');
    }
  });

  // Interactive Click Handlers on Progress Cards
  const progressCards = document.querySelectorAll('.profile-stat-box');
  progressCards.forEach((card) => {
    card.addEventListener('click', () => {
      const title = card.querySelector('.stat-box-title')?.textContent?.trim() || 'Metric';
      const val = card.querySelector('.stat-box-val')?.textContent?.trim() || '';
      showToast(`${title}: ${val}`);
    });
  });

  // Contest Rows Interaction
  const contestRows = document.querySelectorAll('.contest-item-row');
  contestRows.forEach((row) => {
    row.addEventListener('click', () => {
      const name = row.querySelector('.contest-name-cell')?.textContent?.trim();
      const score = row.querySelector('.contest-score-cell')?.textContent?.trim();
      showToast(`${name}: Scored ${score}`);
    });
  });

  // Quest Rows Interaction
  const questRows = document.querySelectorAll('.quest-item-row');
  questRows.forEach((row) => {
    row.addEventListener('click', () => {
      const title = row.querySelector('.quest-name-title')?.textContent?.trim();
      showToast(`Quest: ${title} (Completed)`);
    });
  });

  // Logout button in header popup
  const btnLogout = document.getElementById('btn-menu-logout') || document.getElementById('btn-logout');
  btnLogout?.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOutClerk();
  });

  // Sync Clerk profile data if authenticated
  initClerkUserSync().then((user: any) => {
    if (user) {
      const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const email = user.primaryEmailAddress?.emailAddress;
      if (fullName) profile.name = fullName;
      if (email) profile.email = email;
      renderProfile();
    }
  });
});
