/**
 * KUIZU Settings Page Logic
 */
import { signOutClerk } from './services/clerkService';
import './services/adminAuthGuard';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  notifications: {
    dailyReminders: boolean;
    contestUpdates: boolean;
    questNotifications: boolean;
    achievementAlerts: boolean;
    emailNotifications: boolean;
  };
  visibility: 'public' | 'friends' | 'private';
  learning: {
    defaultLanguage: string;
    autoSaveCode: boolean;
    fontSize: string;
    editorTheme: string;
  };
  additional: {
    language: string;
    timezone: string;
    studyGoal: string;
    soundEffects: boolean;
  };
  profile: {
    name: string;
    bio: string;
  };
}

const STORAGE_KEY = 'kuizu_user_settings_v1';

const defaultSettings: UserSettings = {
  theme: 'light',
  accentColor: '#2563EB',
  notifications: {
    dailyReminders: true,
    contestUpdates: true,
    questNotifications: true,
    achievementAlerts: true,
    emailNotifications: false,
  },
  visibility: 'public',
  learning: {
    defaultLanguage: 'C++',
    autoSaveCode: true,
    fontSize: 'Medium',
    editorTheme: 'Monokai',
  },
  additional: {
    language: 'English',
    timezone: '(GMT +05:30) India Standard Time',
    studyGoal: '2 hours',
    soundEffects: true,
  },
  profile: {
    name: 'Anuj Sandeep Chavan',
    bio: 'Top Coder • Always learning algorithms',
  },
};

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Could not parse saved settings', err);
  }
  return defaultSettings;
}

function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not save settings', err);
  }
}

let currentSettings = loadSettings();

/**
 * Toast Notification Helper
 */
function showToast(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `settings-toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-dot"></span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  // Auto remove after 3.2s
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

/**
 * Modal Handling
 */
function openModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }
}

function closeModal(modalId: string): void {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Initialize Dropdown and Menus
 */
function setupUserMenu(): void {
  const avatarBtn = document.getElementById('btn-user-avatar');
  const dropdown = document.getElementById('user-dropdown');

  if (avatarBtn && dropdown) {
    avatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('show');
      if (isOpen) {
        dropdown.classList.remove('show');
        avatarBtn.setAttribute('aria-expanded', 'false');
      } else {
        dropdown.classList.add('show');
        avatarBtn.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target as Node) && !avatarBtn.contains(e.target as Node)) {
        dropdown.classList.remove('show');
        avatarBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Profile redirection from popup card and header mini-card
  const popupUserHeader = document.querySelector('.popup-user-header');
  popupUserHeader?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  const btnEditProfileHeader = document.querySelector('.btn-edit-profile');
  btnEditProfileHeader?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  // Quick theme toggle from dropdown
  const btnTheme = document.getElementById('btn-menu-theme');
  btnTheme?.addEventListener('click', () => {
    const nextTheme = currentSettings.theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    showToast(`Switched to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)} theme!`, 'info');
  });

  // Logout button
  const btnLogout = document.getElementById('btn-logout');
  btnLogout?.addEventListener('click', async (e) => {
    e.preventDefault();
    showToast('Signing out...', 'info');
    await signOutClerk();
  });
}

/**
 * Theme Management
 */
function setTheme(theme: 'light' | 'dark' | 'system'): void {
  currentSettings.theme = theme;
  saveSettings(currentSettings);

  document.querySelectorAll('.theme-choice-btn').forEach((btn) => {
    const t = btn.getAttribute('data-theme');
    if (t === theme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (theme === 'dark') {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
}

/**
 * Accent Color Management
 */
function setAccentColor(color: string): void {
  currentSettings.accentColor = color;
  saveSettings(currentSettings);

  document.querySelectorAll('.accent-circle-btn').forEach((btn) => {
    const c = btn.getAttribute('data-color');
    if (c === color) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.documentElement.style.setProperty('--primary-accent', color);
  showToast('Accent color updated', 'success');
}

/**
 * Profile Visibility
 */
function setVisibility(visibility: 'public' | 'friends' | 'private'): void {
  currentSettings.visibility = visibility;
  saveSettings(currentSettings);

  document.querySelectorAll('.visibility-radio-card').forEach((card) => {
    const v = card.getAttribute('data-visibility');
    const isTarget = v === visibility;
    card.classList.toggle('active', isTarget);
    card.setAttribute('aria-checked', isTarget ? 'true' : 'false');
  });

  showToast(`Profile visibility set to ${visibility.charAt(0).toUpperCase() + visibility.slice(1)}`, 'info');
}

/**
 * Setup All Event Listeners on Settings Controls
 */
function setupSettingsControls(): void {
  // Theme buttons
  document.querySelectorAll('.theme-choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme') as 'light' | 'dark' | 'system';
      if (theme) {
        setTheme(theme);
        showToast(`Theme changed to ${theme.toUpperCase()}`, 'info');
      }
    });
  });

  // Accent color buttons
  document.querySelectorAll('.accent-circle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      if (color) {
        setAccentColor(color);
      }
    });
  });

  // Notification Toggles
  const toggleDaily = document.getElementById('toggle-daily-reminders') as HTMLInputElement | null;
  toggleDaily?.addEventListener('change', () => {
    currentSettings.notifications.dailyReminders = toggleDaily.checked;
    saveSettings(currentSettings);
    showToast(`Daily reminders ${toggleDaily.checked ? 'enabled' : 'disabled'}`, 'info');
  });

  const toggleContest = document.getElementById('toggle-contest-updates') as HTMLInputElement | null;
  toggleContest?.addEventListener('change', () => {
    currentSettings.notifications.contestUpdates = toggleContest.checked;
    saveSettings(currentSettings);
    showToast(`Contest alerts ${toggleContest.checked ? 'enabled' : 'disabled'}`, 'info');
  });

  const toggleQuest = document.getElementById('toggle-quest-notifications') as HTMLInputElement | null;
  toggleQuest?.addEventListener('change', () => {
    currentSettings.notifications.questNotifications = toggleQuest.checked;
    saveSettings(currentSettings);
    showToast(`Quest notifications ${toggleQuest.checked ? 'enabled' : 'disabled'}`, 'info');
  });

  const toggleAchievement = document.getElementById('toggle-achievement-alerts') as HTMLInputElement | null;
  toggleAchievement?.addEventListener('change', () => {
    currentSettings.notifications.achievementAlerts = toggleAchievement.checked;
    saveSettings(currentSettings);
    showToast(`Achievement alerts ${toggleAchievement.checked ? 'enabled' : 'disabled'}`, 'info');
  });

  const toggleEmail = document.getElementById('toggle-email-notifications') as HTMLInputElement | null;
  toggleEmail?.addEventListener('change', () => {
    currentSettings.notifications.emailNotifications = toggleEmail.checked;
    saveSettings(currentSettings);
    showToast(`Email updates ${toggleEmail.checked ? 'enabled' : 'disabled'}`, 'info');
  });

  // Profile Visibility Radio Cards
  document.querySelectorAll('.visibility-radio-card').forEach((card) => {
    card.addEventListener('click', () => {
      const v = card.getAttribute('data-visibility') as 'public' | 'friends' | 'private';
      if (v) setVisibility(v);
    });

    card.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === ' ' || ke.key === 'Enter') {
        ke.preventDefault();
        const v = card.getAttribute('data-visibility') as 'public' | 'friends' | 'private';
        if (v) setVisibility(v);
      }
    });
  });

  // Learning Preferences
  const selectLang = document.getElementById('select-default-language') as HTMLSelectElement | null;
  selectLang?.addEventListener('change', () => {
    currentSettings.learning.defaultLanguage = selectLang.value;
    saveSettings(currentSettings);
    showToast(`Default coding language: ${selectLang.value}`, 'success');
  });

  const toggleAutoSave = document.getElementById('toggle-autosave-code') as HTMLInputElement | null;
  toggleAutoSave?.addEventListener('change', () => {
    currentSettings.learning.autoSaveCode = toggleAutoSave.checked;
    saveSettings(currentSettings);
    showToast(`Code auto-save ${toggleAutoSave.checked ? 'activated' : 'paused'}`, 'info');
  });

  const selectFontSize = document.getElementById('select-font-size') as HTMLSelectElement | null;
  selectFontSize?.addEventListener('change', () => {
    currentSettings.learning.fontSize = selectFontSize.value;
    saveSettings(currentSettings);
    showToast(`Editor font size set to ${selectFontSize.value}`, 'info');
  });

  const selectTheme = document.getElementById('select-editor-theme') as HTMLSelectElement | null;
  selectTheme?.addEventListener('change', () => {
    currentSettings.learning.editorTheme = selectTheme.value;
    saveSettings(currentSettings);
    showToast(`Editor theme: ${selectTheme.value}`, 'info');
  });

  // Additional Settings
  const selectLanguage = document.getElementById('select-language') as HTMLSelectElement | null;
  selectLanguage?.addEventListener('change', () => {
    currentSettings.additional.language = selectLanguage.value;
    saveSettings(currentSettings);
    showToast(`Interface language: ${selectLanguage.value}`, 'info');
  });

  const selectTimezone = document.getElementById('select-timezone') as HTMLSelectElement | null;
  selectTimezone?.addEventListener('change', () => {
    currentSettings.additional.timezone = selectTimezone.value;
    saveSettings(currentSettings);
    showToast(`Timezone updated`, 'info');
  });

  const selectGoal = document.getElementById('select-study-goal') as HTMLSelectElement | null;
  selectGoal?.addEventListener('change', () => {
    currentSettings.additional.studyGoal = selectGoal.value;
    saveSettings(currentSettings);
    showToast(`Daily study goal: ${selectGoal.value}`, 'success');
  });

  const toggleSound = document.getElementById('toggle-sound-effects') as HTMLInputElement | null;
  toggleSound?.addEventListener('change', () => {
    currentSettings.additional.soundEffects = toggleSound.checked;
    saveSettings(currentSettings);
    showToast(`Sound effects ${toggleSound.checked ? 'enabled' : 'muted'}`, 'info');
  });

  // Action Buttons & Modals
  const btnEditProfile = document.getElementById('btn-edit-profile');
  btnEditProfile?.addEventListener('click', () => openModal('edit-profile-modal'));

  const btnCloseProfile = document.getElementById('btn-close-profile-modal');
  const btnCancelProfile = document.getElementById('btn-cancel-profile');
  [btnCloseProfile, btnCancelProfile].forEach((btn) => {
    btn?.addEventListener('click', () => closeModal('edit-profile-modal'));
  });

  const formEditProfile = document.getElementById('form-edit-profile') as HTMLFormElement | null;
  formEditProfile?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('input-display-name') as HTMLInputElement | null;
    const bioInput = document.getElementById('input-bio') as HTMLInputElement | null;
    if (nameInput) {
      currentSettings.profile.name = nameInput.value;
      const profileName = document.querySelector('.settings-profile-name');
      if (profileName) profileName.textContent = nameInput.value;
    }
    if (bioInput) {
      currentSettings.profile.bio = bioInput.value;
    }
    saveSettings(currentSettings);
    closeModal('edit-profile-modal');
    showToast('Profile updated successfully!', 'success');
  });

  // Password Modal
  const btnPassword = document.getElementById('btn-action-password');
  btnPassword?.addEventListener('click', () => openModal('change-password-modal'));

  const btnClosePwd = document.getElementById('btn-close-password-modal');
  const btnCancelPwd = document.getElementById('btn-cancel-password');
  [btnClosePwd, btnCancelPwd].forEach((btn) => {
    btn?.addEventListener('click', () => closeModal('change-password-modal'));
  });

  const formPassword = document.getElementById('form-change-password') as HTMLFormElement | null;
  formPassword?.addEventListener('submit', (e) => {
    e.preventDefault();
    closeModal('change-password-modal');
    showToast('Password changed successfully!', 'success');
    formPassword.reset();
  });

  // 2FA action
  const btn2FA = document.getElementById('btn-action-2fa');
  btn2FA?.addEventListener('click', () => {
    showToast('Two-factor authentication is rolling out soon!', 'info');
  });

  // Connected Accounts Modal
  const btnConnected = document.getElementById('btn-action-connected');
  btnConnected?.addEventListener('click', () => openModal('connected-accounts-modal'));

  const btnCloseConn = document.getElementById('btn-close-connected-modal');
  const btnDoneConn = document.getElementById('btn-close-connected');
  [btnCloseConn, btnDoneConn].forEach((btn) => {
    btn?.addEventListener('click', () => closeModal('connected-accounts-modal'));
  });

  const btnConnectGH = document.getElementById('btn-connect-gh');
  btnConnectGH?.addEventListener('click', () => {
    showToast('Connecting GitHub account...', 'info');
    setTimeout(() => {
      btnConnectGH.textContent = 'Connected';
      btnConnectGH.classList.add('connected');
      showToast('GitHub connected successfully!', 'success');
    }, 800);
  });

  // Delete Account Modal
  const btnDelete = document.getElementById('btn-action-delete');
  btnDelete?.addEventListener('click', () => openModal('delete-account-modal'));

  const btnCloseDel = document.getElementById('btn-close-delete-modal');
  const btnCancelDel = document.getElementById('btn-cancel-delete');
  [btnCloseDel, btnCancelDel].forEach((btn) => {
    btn?.addEventListener('click', () => closeModal('delete-account-modal'));
  });

  const btnConfirmDel = document.getElementById('btn-confirm-delete');
  btnConfirmDel?.addEventListener('click', () => {
    closeModal('delete-account-modal');
    showToast('Account scheduled for deactivation.', 'warning');
  });

  // Close modals on overlay backdrop click
  document.querySelectorAll('.settings-modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });
}

function init(): void {
  setupUserMenu();
  setupSettingsControls();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
