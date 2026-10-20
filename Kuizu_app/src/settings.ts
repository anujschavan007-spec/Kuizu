/**
 * KUIZU Settings Page Logic
 */
import { signOutClerk } from './services/clerkService';
import { highlightCode } from './services/codeHighlighter';
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
function setTheme(theme: 'light' | 'dark' | 'system', notify = true): void {
  currentSettings.theme = theme;
  saveSettings(currentSettings);

  document.querySelectorAll('.theme-choice-btn').forEach((btn) => {
    const t = btn.getAttribute('data-theme');
    btn.classList.toggle('active', t === theme);
  });

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }

  // Update accent background tints for dark/light mode
  applyAccentColor(currentSettings.accentColor || '#2563EB');

  if (notify) {
    showToast(`Theme changed to ${theme.toUpperCase()}`, 'info');
  }
}

/**
 * Accent Color Management
 */
const COLOR_NAMES: Record<string, string> = {
  '#2563eb': 'Royal Blue',
  '#4f46e5': 'Indigo',
  '#7c3aed': 'Purple',
  '#c026d3': 'Fuchsia',
  '#ec4899': 'Pink',
  '#f43f5e': 'Rose',
  '#ef4444': 'Crimson Red',
  '#f97316': 'Sunset Orange',
  '#f59e0b': 'Amber',
  '#eab308': 'Cyber Yellow',
  '#84cc16': 'Neon Lime',
  '#10b981': 'Emerald Green',
  '#14b8a6': 'Aqua Teal',
  '#06b6d4': 'Electric Cyan'
};

function hexToRgba(hex: string, alpha: number): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) return `rgba(37, 99, 235, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustBrightness(hex: string, percent: number): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) return hex;
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r = Math.min(255, Math.max(0, Math.round(r * (1 + percent / 100))));
  g = Math.min(255, Math.max(0, Math.round(g * (1 + percent / 100))));
  b = Math.min(255, Math.max(0, Math.round(b * (1 + percent / 100))));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function applyAccentColor(color: string): void {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark-mode');
  const darker = adjustBrightness(color, -16);
  const subtle = hexToRgba(color, 0.14);
  const glow = hexToRgba(color, 0.38);
  const border = hexToRgba(color, 0.4);
  const lightBg = isDark ? hexToRgba(color, 0.22) : hexToRgba(color, 0.08);

  root.style.setProperty('--primary-accent', color);
  root.style.setProperty('--color-primary', color);
  root.style.setProperty('--primary-accent-hover', darker);
  root.style.setProperty('--color-primary-hover', darker);
  root.style.setProperty('--primary-accent-light', lightBg);
  root.style.setProperty('--color-primary-light', lightBg);
  root.style.setProperty('--primary-accent-subtle', subtle);
  root.style.setProperty('--primary-accent-glow', glow);
  root.style.setProperty('--primary-accent-border', border);
  root.style.setProperty('--color-primary-border', border);

  // Update active state across all accent preset buttons
  let matchedPreset = false;
  document.querySelectorAll('.accent-circle-btn:not(.accent-custom-btn)').forEach((btn) => {
    const c = btn.getAttribute('data-color');
    const isTarget = c?.toLowerCase() === color.toLowerCase();
    btn.classList.toggle('active', isTarget);
    if (isTarget) {
      (btn as HTMLElement).style.setProperty('--accent-color', color);
      matchedPreset = true;
    }
  });

  // Sync custom color picker
  const customBtn = document.querySelector('.accent-custom-btn');
  const customPicker = document.getElementById('accent-custom-picker') as HTMLInputElement | null;
  if (customPicker) {
    customPicker.value = color;
  }
  if (customBtn) {
    customBtn.classList.toggle('active', !matchedPreset);
    if (!matchedPreset) {
      (customBtn as HTMLElement).style.setProperty('--accent-color', color);
    }
  }

  // Save to fast storage key for instant styling
  try {
    localStorage.setItem('kuizu_accent_color', color);
  } catch (_) {}
}

function setAccentColor(color: string, notify = true): void {
  currentSettings.accentColor = color;
  saveSettings(currentSettings);
  applyAccentColor(color);

  if (notify) {
    const name = COLOR_NAMES[color.toLowerCase()] || color.toUpperCase();
    showToast(`Accent color updated to ${name}`, 'success');
  }
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

  // Accent color preset buttons
  document.querySelectorAll('.accent-circle-btn[data-color]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      if (color) {
        setAccentColor(color);
      }
    });
  });

  // Custom color picker
  const customPicker = document.getElementById('accent-custom-picker') as HTMLInputElement | null;
  customPicker?.addEventListener('input', (e) => {
    const val = (e.target as HTMLInputElement).value;
    if (val) {
      applyAccentColor(val);
    }
  });
  customPicker?.addEventListener('change', (e) => {
    const val = (e.target as HTMLInputElement).value;
    if (val) {
      setAccentColor(val, true);
    }
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
    try {
      localStorage.setItem('kuizu_bgm_enabled', String(toggleSound.checked));
    } catch (_) {}
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

function applySavedSettingsToUI(): void {
  // 1. Theme
  setTheme(currentSettings.theme, false);

  // 2. Accent Color
  applyAccentColor(currentSettings.accentColor || '#2563EB');

  // 3. Notification switches
  const toggleDaily = document.getElementById('toggle-daily-reminders') as HTMLInputElement | null;
  if (toggleDaily) toggleDaily.checked = !!currentSettings.notifications.dailyReminders;

  const toggleContest = document.getElementById('toggle-contest-updates') as HTMLInputElement | null;
  if (toggleContest) toggleContest.checked = !!currentSettings.notifications.contestUpdates;

  const toggleQuest = document.getElementById('toggle-quest-notifications') as HTMLInputElement | null;
  if (toggleQuest) toggleQuest.checked = !!currentSettings.notifications.questNotifications;

  const toggleAchievement = document.getElementById('toggle-achievement-alerts') as HTMLInputElement | null;
  if (toggleAchievement) toggleAchievement.checked = !!currentSettings.notifications.achievementAlerts;

  const toggleEmail = document.getElementById('toggle-email-notifications') as HTMLInputElement | null;
  if (toggleEmail) toggleEmail.checked = !!currentSettings.notifications.emailNotifications;

  // 4. Visibility radio cards
  document.querySelectorAll('.visibility-radio-card').forEach((card) => {
    const v = card.getAttribute('data-visibility');
    const isTarget = v === currentSettings.visibility;
    card.classList.toggle('active', isTarget);
    card.setAttribute('aria-checked', isTarget ? 'true' : 'false');
  });

  // 5. Learning Preferences
  const selectLang = document.getElementById('select-default-language') as HTMLSelectElement | null;
  if (selectLang && currentSettings.learning?.defaultLanguage) {
    selectLang.value = currentSettings.learning.defaultLanguage;
  }

  const toggleAutoSave = document.getElementById('toggle-autosave-code') as HTMLInputElement | null;
  if (toggleAutoSave && currentSettings.learning) {
    toggleAutoSave.checked = !!currentSettings.learning.autoSaveCode;
  }

  const selectFontSize = document.getElementById('select-font-size') as HTMLSelectElement | null;
  if (selectFontSize && currentSettings.learning?.fontSize) {
    selectFontSize.value = currentSettings.learning.fontSize;
  }

  const selectTheme = document.getElementById('select-editor-theme') as HTMLSelectElement | null;
  if (selectTheme && currentSettings.learning?.editorTheme) {
    selectTheme.value = currentSettings.learning.editorTheme;
  }

  // 6. Additional Settings
  const selectLanguage = document.getElementById('select-language') as HTMLSelectElement | null;
  if (selectLanguage && currentSettings.additional?.language) {
    selectLanguage.value = currentSettings.additional.language;
  }

  const selectTimezone = document.getElementById('select-timezone') as HTMLSelectElement | null;
  if (selectTimezone && currentSettings.additional?.timezone) {
    selectTimezone.value = currentSettings.additional.timezone;
  }

  const selectStudyGoal = document.getElementById('select-study-goal') as HTMLSelectElement | null;
  if (selectStudyGoal && currentSettings.additional?.studyGoal) {
    selectStudyGoal.value = currentSettings.additional.studyGoal;
  }

  const toggleSounds = document.getElementById('toggle-sound-effects') as HTMLInputElement | null;
  if (toggleSounds && currentSettings.additional) {
    toggleSounds.checked = !!currentSettings.additional.soundEffects;
  }

  // 7. Profile header
  const profileName = document.querySelector('.settings-profile-name');
  if (profileName && currentSettings.profile?.name) {
    profileName.textContent = currentSettings.profile.name;
  }
}

/**
 * Learning Preferences Interactive Code Editor Manager
 */
const LANGUAGE_STARTERS: Record<string, { filename: string; langCode: string; code: string }> = {
  'C++': {
    filename: 'main.cpp',
    langCode: 'cpp',
    code: `#include <iostream>
using namespace std;

int main() {
    // Learning Preferences: C++
    cout << "Welcome to KUIZU!" << endl;
    return 0;
}`
  },
  'Python': {
    filename: 'main.py',
    langCode: 'python',
    code: `# Learning Preferences: Python
def solution():
    message = "Welcome to KUIZU!"
    print(message)

if __name__ == "__main__":
    solution()`
  },
  'JavaScript': {
    filename: 'index.js',
    langCode: 'javascript',
    code: `// Learning Preferences: JavaScript
function solution() {
    const greeting = "Welcome to KUIZU!";
    console.log(greeting);
}

solution();`
  },
  'TypeScript': {
    filename: 'main.ts',
    langCode: 'typescript',
    code: `// Learning Preferences: TypeScript
function solution(): void {
    const greeting: string = "Welcome to KUIZU!";
    console.log(greeting);
}

solution();`
  },
  'Java': {
    filename: 'Main.java',
    langCode: 'java',
    code: `// Learning Preferences: Java
public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to KUIZU!");
    }
}`
  },
  'C': {
    filename: 'main.c',
    langCode: 'cpp',
    code: `#include <stdio.h>

int main() {
    // Learning Preferences: C
    printf("Welcome to KUIZU!\\n");
    return 0;
}`
  }
};

const THEME_CLASSES: Record<string, string> = {
  'Monokai': 'editor-theme-monokai',
  'VS Code Dark': 'editor-theme-vscode-dark',
  'GitHub Light': 'editor-theme-github-light',
  'Dracula': 'editor-theme-dracula',
  'One Dark': 'editor-theme-onedark',
};

const FONT_SIZE_CLASSES: Record<string, string> = {
  'Small': 'editor-size-small',
  'Medium': 'editor-size-medium',
  'Large': 'editor-size-large',
};

const FONT_SIZE_LABELS: Record<string, string> = {
  'Small': '12px',
  'Medium': '14px',
  'Large': '16px',
};

function setupLearningPreferencesPreview(): void {
  const previewEditorBody = document.getElementById('learning-preview-editor-body');
  const previewTextarea = document.getElementById('learning-preview-editor') as HTMLTextAreaElement | null;
  const previewHighlight = document.getElementById('learning-preview-highlight');
  const previewGutter = document.getElementById('learning-preview-gutter');
  const previewTabFilename = document.getElementById('preview-tab-filename');
  const previewThemeBadge = document.getElementById('preview-theme-badge');
  const previewSizeBadge = document.getElementById('preview-size-badge');
  const previewAutosaveBadge = document.getElementById('preview-autosave-badge');
  const previewCursorPos = document.getElementById('preview-cursor-pos');
  const previewLangDisplay = document.getElementById('preview-lang-display');
  const btnResetPreview = document.getElementById('btn-reset-preview-code');

  if (!previewEditorBody || !previewTextarea || !previewHighlight || !previewGutter) {
    return;
  }

  // Update line numbers & highlight layer
  function updatePreview() {
    if (!previewTextarea || !previewHighlight || !previewGutter) return;
    const code = previewTextarea.value;
    const currentLang = currentSettings.learning?.defaultLanguage || 'C++';
    const starter = LANGUAGE_STARTERS[currentLang] || LANGUAGE_STARTERS['C++'];

    // Gutter line numbers
    const lines = code.split('\n').length;
    let gutterHtml = '';
    for (let i = 1; i <= Math.max(lines, 8); i++) {
      gutterHtml += `<div>${i}</div>`;
    }
    previewGutter.innerHTML = gutterHtml;

    // Syntax highlighting layer
    previewHighlight.innerHTML = highlightCode(code, starter.langCode) + '\n';
  }

  // Synchronize scroll
  previewTextarea.addEventListener('scroll', () => {
    previewHighlight.scrollTop = previewTextarea.scrollTop;
    previewHighlight.scrollLeft = previewTextarea.scrollLeft;
    previewGutter.scrollTop = previewTextarea.scrollTop;
  });

  // Cursor position tracking
  function updateCursorPos() {
    if (!previewTextarea || !previewCursorPos) return;
    const val = previewTextarea.value;
    const sel = previewTextarea.selectionStart;
    const lines = val.substring(0, sel).split('\n');
    const row = lines.length;
    const col = lines[lines.length - 1].length + 1;
    previewCursorPos.textContent = `Ln ${row}, Col ${col}`;
  }

  previewTextarea.addEventListener('keyup', updateCursorPos);
  previewTextarea.addEventListener('click', updateCursorPos);

  // Apply Theme
  function applyPreviewTheme(theme: string) {
    if (!previewEditorBody) return;
    Object.values(THEME_CLASSES).forEach(cls => previewEditorBody.classList.remove(cls));
    const targetCls = THEME_CLASSES[theme] || 'editor-theme-monokai';
    previewEditorBody.classList.add(targetCls);
    if (previewThemeBadge) previewThemeBadge.textContent = theme;
  }

  // Apply Font Size
  function applyPreviewFontSize(size: string) {
    if (!previewEditorBody) return;
    Object.values(FONT_SIZE_CLASSES).forEach(cls => previewEditorBody.classList.remove(cls));
    const targetCls = FONT_SIZE_CLASSES[size] || 'editor-size-medium';
    previewEditorBody.classList.add(targetCls);
    if (previewSizeBadge) previewSizeBadge.textContent = FONT_SIZE_LABELS[size] || size;
  }

  // Apply Language & Code Template
  function applyPreviewLanguage(lang: string, forceResetTemplate: boolean = false) {
    const starter = LANGUAGE_STARTERS[lang] || LANGUAGE_STARTERS['C++'];
    if (previewTabFilename) previewTabFilename.textContent = starter.filename;
    if (previewLangDisplay) previewLangDisplay.textContent = lang;

    if (previewTextarea) {
      const draftKey = `kuizu_preview_draft_${lang}`;
      const savedDraft = !forceResetTemplate && currentSettings.learning?.autoSaveCode
        ? localStorage.getItem(draftKey)
        : null;

      previewTextarea.value = savedDraft !== null ? savedDraft : starter.code;
      updatePreview();
      updateCursorPos();
    }
  }

  // Apply Autosave State
  function applyPreviewAutosave(enabled: boolean) {
    if (!previewAutosaveBadge) return;
    const textEl = previewAutosaveBadge.querySelector('.autosave-indicator-text');
    if (enabled) {
      previewAutosaveBadge.classList.remove('disabled');
      if (textEl) textEl.textContent = 'Auto-save on';
    } else {
      previewAutosaveBadge.classList.add('disabled');
      if (textEl) textEl.textContent = 'Auto-save off';
    }
  }

  // Debounced auto-save on typing
  let autoSaveTimer: any = null;
  previewTextarea.addEventListener('input', () => {
    updatePreview();
    updateCursorPos();

    if (currentSettings.learning?.autoSaveCode) {
      if (previewAutosaveBadge) {
        const textEl = previewAutosaveBadge.querySelector('.autosave-indicator-text');
        if (textEl) textEl.textContent = 'Saving...';
      }
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => {
        const lang = currentSettings.learning?.defaultLanguage || 'C++';
        localStorage.setItem(`kuizu_preview_draft_${lang}`, previewTextarea.value);
        if (previewAutosaveBadge) {
          const textEl = previewAutosaveBadge.querySelector('.autosave-indicator-text');
          if (textEl) textEl.textContent = 'Auto-saved';
          setTimeout(() => {
            if (textEl && currentSettings.learning?.autoSaveCode) {
              textEl.textContent = 'Auto-save on';
            }
          }, 1800);
        }
      }, 450);
    }
  });

  // Intelligent Indent & Auto-closing pairs
  const closePairs: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`'
  };
  const matchingClosers = new Set([')', ']', '}', '"', "'", '`']);

  previewTextarea.addEventListener('keydown', (e) => {
    if (!previewTextarea) return;
    const start = previewTextarea.selectionStart;
    const end = previewTextarea.selectionEnd;
    const val = previewTextarea.value;

    // Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      previewTextarea.value = val.substring(0, start) + '    ' + val.substring(end);
      previewTextarea.selectionStart = previewTextarea.selectionEnd = start + 4;
      updatePreview();
      return;
    }

    // Enter key auto-indent
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      const matchIndent = currentLine.match(/^\s*/);
      let indent = matchIndent ? matchIndent[0] : '';
      const charBefore = val[start - 1];
      const charAfter = val[start];

      if ((charBefore === '{' && charAfter === '}') || (charBefore === '(' && charAfter === ')')) {
        const extraIndent = indent + '    ';
        previewTextarea.value = val.substring(0, start) + '\n' + extraIndent + '\n' + indent + val.substring(end);
        previewTextarea.selectionStart = previewTextarea.selectionEnd = start + 1 + extraIndent.length;
      } else {
        if (charBefore === '{' || charBefore === '(' || charBefore === ':') {
          indent += '    ';
        }
        previewTextarea.value = val.substring(0, start) + '\n' + indent + val.substring(end);
        previewTextarea.selectionStart = previewTextarea.selectionEnd = start + 1 + indent.length;
      }
      updatePreview();
      return;
    }

    // Skip over closing bracket/quote if already next
    if (matchingClosers.has(e.key) && start === end && val[start] === e.key) {
      e.preventDefault();
      previewTextarea.selectionStart = previewTextarea.selectionEnd = start + 1;
      return;
    }

    // Auto-complete opening brackets, braces, and quotes
    if (closePairs[e.key]) {
      e.preventDefault();
      const closer = closePairs[e.key];
      const selectedText = val.substring(start, end);
      previewTextarea.value = val.substring(0, start) + e.key + selectedText + closer + val.substring(end);
      previewTextarea.selectionStart = start + 1;
      previewTextarea.selectionEnd = start + 1 + selectedText.length;
      updatePreview();
      return;
    }

    // Backspace pair deletion
    if (e.key === 'Backspace' && start === end && start > 0) {
      const charBefore = val[start - 1];
      const charAfter = val[start];
      if (closePairs[charBefore] && closePairs[charBefore] === charAfter) {
        e.preventDefault();
        previewTextarea.value = val.substring(0, start - 1) + val.substring(start + 1);
        previewTextarea.selectionStart = previewTextarea.selectionEnd = start - 1;
        updatePreview();
        return;
      }
    }
  });

  // Reset Template Button
  btnResetPreview?.addEventListener('click', () => {
    const lang = currentSettings.learning?.defaultLanguage || 'C++';
    localStorage.removeItem(`kuizu_preview_draft_${lang}`);
    applyPreviewLanguage(lang, true);
    showToast(`Template reset for ${lang}`, 'info');
  });

  // Initial State Rendering
  applyPreviewTheme(currentSettings.learning?.editorTheme || 'Monokai');
  applyPreviewFontSize(currentSettings.learning?.fontSize || 'Medium');
  applyPreviewLanguage(currentSettings.learning?.defaultLanguage || 'C++');
  applyPreviewAutosave(!!currentSettings.learning?.autoSaveCode);

  // Hook into Control Change Handlers
  const selectLang = document.getElementById('select-default-language') as HTMLSelectElement | null;
  selectLang?.addEventListener('change', () => {
    applyPreviewLanguage(selectLang.value);
  });

  const selectTheme = document.getElementById('select-editor-theme') as HTMLSelectElement | null;
  selectTheme?.addEventListener('change', () => {
    applyPreviewTheme(selectTheme.value);
  });

  const selectFontSize = document.getElementById('select-font-size') as HTMLSelectElement | null;
  selectFontSize?.addEventListener('change', () => {
    applyPreviewFontSize(selectFontSize.value);
  });

  const toggleAutoSave = document.getElementById('toggle-autosave-code') as HTMLInputElement | null;
  toggleAutoSave?.addEventListener('change', () => {
    applyPreviewAutosave(toggleAutoSave.checked);
  });
}

function init(): void {
  applySavedSettingsToUI();
  setupUserMenu();
  setupSettingsControls();
  setupLearningPreferencesPreview();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
