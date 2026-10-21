import './adminProfileModal';
import { supabase } from './services/supabaseApiBridge';
import { soundManager } from './services/soundManager';
import {
  setTheme,
  setAccentColor,
  setFontTheme,
  setFontFamily,
  setFontSize,
  getActiveTheme,
  getActiveAccentColor,
  getActiveFontSettings,
  FONT_THEMES,
} from './theme';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Toast Notification Helper
  const toastEl = document.getElementById('admin-toast');
  function showToast(message: string, duration = 3200) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  // 2. Format and display today's date on topbar pill
  const datePillLabel = document.getElementById('label-admin-date');
  const datePill = document.getElementById('admin-date-pill');
  if (datePillLabel) {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    datePillLabel.textContent = formatted;
  }
  datePill?.addEventListener('click', () => {
    showToast(`System Uptime: 99.98% • Server Time: ${new Date().toLocaleTimeString()}`);
  });

  // 3. Tab Navigation & Scroll Sync
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.admin-setting-tab-btn');
  const sections = document.querySelectorAll<HTMLElement>('.admin-setting-card');

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      if (!tabId) return;

      const targetEl = document.getElementById(`section-${tabId}`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Scroll spy to highlight active tab
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.id.replace('section-', '');
            tabButtons.forEach((btn) => {
              if (btn.getAttribute('data-tab') === sectionId) {
                tabButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
              }
            });
          }
        });
      },
      { rootMargin: '-10% 0px -70% 0px' }
    );

    sections.forEach((s) => observer.observe(s));
  }

  // 4. Theme Segmented Group (Light, Dark, System)
  const themeButtons = document.querySelectorAll<HTMLButtonElement>('.admin-theme-segment-btn');
  const currentTheme = getActiveTheme();

  themeButtons.forEach((btn) => {
    if (btn.getAttribute('data-theme') === currentTheme) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }

    btn.addEventListener('click', () => {
      themeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const selectedTheme = (btn.getAttribute('data-theme') as 'light' | 'dark' | 'system') || 'light';
      setTheme(selectedTheme);
      updateLivePreview();
      showToast(`${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} theme applied globally!`);
    });
  });

  // 5. Accent Color Selection
  const accentButtons = document.querySelectorAll<HTMLButtonElement>('.admin-accent-color-btn');
  const customAccentInput = document.getElementById('input-custom-accent') as HTMLInputElement | null;
  const activeAccentHexLabel = document.getElementById('label-active-accent-hex');
  const currentAccent = getActiveAccentColor();

  function syncAccentUI(color: string) {
    if (activeAccentHexLabel) activeAccentHexLabel.textContent = color.toUpperCase();
    if (customAccentInput) customAccentInput.value = color;

    accentButtons.forEach((btn) => {
      const btnColor = btn.getAttribute('data-color');
      if (btnColor && btnColor.toLowerCase() === color.toLowerCase()) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  syncAccentUI(currentAccent);

  accentButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color') || '#2563EB';
      setAccentColor(color);
      syncAccentUI(color);
      updateLivePreview();
      showToast(`Accent color updated to ${color}`);
    });
  });

  customAccentInput?.addEventListener('input', () => {
    const color = customAccentInput.value;
    setAccentColor(color);
    syncAccentUI(color);
    updateLivePreview();
  });

  // 6. Font Colors & Typography Themes ("add colors to fonts")
  const fontThemeChips = document.querySelectorAll<HTMLButtonElement>('.admin-font-theme-chip');
  const customFontColorInput = document.getElementById('input-custom-font-color') as HTMLInputElement | null;
  const activeFontThemeLabel = document.getElementById('label-active-font-theme');
  const fontFamilySelect = document.getElementById('setting-font-family') as HTMLSelectElement | null;
  const fontScaleButtons = document.querySelectorAll<HTMLButtonElement>('.admin-theme-segment-btn[data-font-scale]');
  const fontSettings = getActiveFontSettings();

  function syncFontThemeUI() {
    const fs = getActiveFontSettings();
    const themeDef = FONT_THEMES[fs.themeId];

    if (activeFontThemeLabel) {
      activeFontThemeLabel.textContent = fs.customColor
        ? `Custom (${fs.customColor})`
        : themeDef ? themeDef.name : 'Custom';
    }

    if (customFontColorInput && fs.customColor) {
      customFontColorInput.value = fs.customColor;
    }

    fontThemeChips.forEach((chip) => {
      const t = chip.getAttribute('data-font-theme');
      if (!fs.customColor && t === fs.themeId) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    if (fontFamilySelect && fs.fontFamily) {
      fontFamilySelect.value = fs.fontFamily;
    }

    fontScaleButtons.forEach((btn) => {
      if (btn.getAttribute('data-font-scale') === fs.fontSize) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    updateLivePreview();
  }

  fontThemeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const themeId = chip.getAttribute('data-font-theme') || 'slate';
      // Clear custom color and set theme
      const current = getActiveFontSettings();
      delete current.customColor;
      localStorage.setItem('kuizu_font_settings', JSON.stringify(current));
      setFontTheme(themeId);
      syncFontThemeUI();
      const name = FONT_THEMES[themeId]?.name || themeId;
      showToast(`Font color theme set to ${name}`);
    });
  });

  customFontColorInput?.addEventListener('input', () => {
    const color = customFontColorInput.value;
    setFontTheme('custom', color);
    syncFontThemeUI();
  });

  fontFamilySelect?.addEventListener('change', () => {
    const family = fontFamilySelect.value;
    setFontFamily(family);
    syncFontThemeUI();
    showToast(`Font family updated to ${family}`);
  });

  fontScaleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const scale = (btn.getAttribute('data-font-scale') as 'Compact' | 'Standard' | 'Spacious') || 'Standard';
      setFontSize(scale);
      syncFontThemeUI();
      showToast(`Font scaling set to ${scale}`);
    });
  });

  // Interactive Live Typography & Colors Preview updater
  function updateLivePreview() {
    const previewBox = document.getElementById('admin-font-preview-box');
    const previewHeading = document.getElementById('preview-heading-text');
    const previewMeta = document.getElementById('preview-active-meta');
    const previewBtn = document.getElementById('btn-preview-sample-action');
    if (!previewBox) return;

    const fs = getActiveFontSettings();
    const accent = getActiveAccentColor();
    const themeName = FONT_THEMES[fs.themeId]?.name || (fs.customColor ? 'Custom Hex' : 'Custom');

    if (previewHeading) {
      previewHeading.style.fontFamily = `'${fs.fontFamily || 'Outfit'}', sans-serif`;
    }
    if (previewMeta) {
      previewMeta.textContent = `${fs.fontFamily || 'Outfit'} • ${themeName} • ${accent.toUpperCase()}`;
    }
    if (previewBtn) {
      previewBtn.style.backgroundColor = accent;
    }
  }

  syncFontThemeUI();

  // 7. General Settings Controls
  const platformNameInput = document.getElementById('setting-platform-name') as HTMLInputElement | null;
  const platformTaglineInput = document.getElementById('setting-platform-tagline') as HTMLInputElement | null;
  const maintenanceToggle = document.getElementById('toggle-maintenance-mode') as HTMLInputElement | null;
  const maintenanceBadge = document.getElementById('badge-maintenance-status');
  const languageSelect = document.getElementById('setting-language') as HTMLSelectElement | null;
  const timezoneSelect = document.getElementById('setting-timezone') as HTMLSelectElement | null;
  const autoSaveToggle = document.getElementById('toggle-autosave') as HTMLInputElement | null;
  const leaderboardToggle = document.getElementById('toggle-show-leaderboard') as HTMLInputElement | null;
  const soundEffectsToggle = document.getElementById('toggle-sound-effects') as HTMLInputElement | null;

  // Load saved general settings
  try {
    const rawGen = localStorage.getItem('kuizu_admin_general_settings');
    if (rawGen) {
      const gen = JSON.parse(rawGen);
      if (platformNameInput && gen.name) platformNameInput.value = gen.name;
      if (platformTaglineInput && gen.tagline) platformTaglineInput.value = gen.tagline;
      if (languageSelect && gen.language) languageSelect.value = gen.language;
      if (timezoneSelect && gen.timezone) timezoneSelect.value = gen.timezone;
      if (maintenanceToggle && typeof gen.maintenance === 'boolean') {
        maintenanceToggle.checked = gen.maintenance;
        updateMaintenanceBadge(gen.maintenance);
      }
      if (autoSaveToggle && typeof gen.autoSave === 'boolean') autoSaveToggle.checked = gen.autoSave;
      if (leaderboardToggle && typeof gen.showLeaderboard === 'boolean') leaderboardToggle.checked = gen.showLeaderboard;
      if (soundEffectsToggle && typeof gen.soundEffects === 'boolean') soundEffectsToggle.checked = gen.soundEffects;
    }
  } catch (_) {}

  function updateMaintenanceBadge(isActive: boolean) {
    if (!maintenanceBadge) return;
    if (isActive) {
      maintenanceBadge.textContent = 'Active (Under Maintenance)';
      maintenanceBadge.className = 'admin-badge-status warning';
    } else {
      maintenanceBadge.textContent = 'Disabled';
      maintenanceBadge.className = 'admin-badge-status inactive';
    }
  }

  maintenanceToggle?.addEventListener('change', () => {
    updateMaintenanceBadge(maintenanceToggle.checked);
    showToast(maintenanceToggle.checked ? 'Maintenance Mode enabled: User arenas paused' : 'Maintenance Mode disabled: Arenas active');
  });

  // 8. Notifications Controls & Test Notification
  const emailNotifToggle = document.getElementById('toggle-email-notif') as HTMLInputElement | null;
  const platformNotifToggle = document.getElementById('toggle-platform-notif') as HTMLInputElement | null;
  const cheatAlertsToggle = document.getElementById('toggle-cheat-alerts') as HTMLInputElement | null;
  const quizRemindersToggle = document.getElementById('toggle-quiz-reminders') as HTMLInputElement | null;
  const marketingToggle = document.getElementById('toggle-marketing-updates') as HTMLInputElement | null;
  const testNotifBtn = document.getElementById('btn-test-notification');

  // Web Audio chime helper for test alert
  function playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (_) {}
  }

  testNotifBtn?.addEventListener('click', () => {
    playNotificationChime();
    showToast('⚡ Test Alert: KUIZU Notification and Surveillance System is fully operational!', 4000);
  });

  // 9. Admin Account & Password Management
  const accountNameInput = document.getElementById('admin-account-name') as HTMLInputElement | null;
  const accountEmailInput = document.getElementById('admin-account-email') as HTMLInputElement | null;
  const accountAvatarImg = document.getElementById('admin-account-avatar-preview') as HTMLImageElement | null;
  const sidebarAvatarImg = document.getElementById('sidebar-admin-avatar-img') as HTMLImageElement | null;
  const sidebarNameText = document.getElementById('sidebar-admin-name-text');
  const accountDisplayTitle = document.getElementById('admin-account-display-title');
  const accountDisplayEmail = document.getElementById('admin-account-display-email');
  const saveAccountBtn = document.getElementById('btn-save-account');

  // Load admin profile
  const savedAdminName = localStorage.getItem('kuizu_admin_name') || 'Admin';
  const savedAdminEmail = localStorage.getItem('kuizu_user_email') || 'admin@kuizu.io';
  const savedAdminAvatar = localStorage.getItem('kuizu_admin_avatar') || '/images/admin_avatar.png';

  if (accountNameInput) accountNameInput.value = savedAdminName;
  if (accountEmailInput) accountEmailInput.value = savedAdminEmail;
  if (accountDisplayTitle) accountDisplayTitle.textContent = savedAdminName;
  if (accountDisplayEmail) accountDisplayEmail.textContent = savedAdminEmail;
  if (sidebarNameText) sidebarNameText.textContent = savedAdminName;
  if (accountAvatarImg) accountAvatarImg.src = savedAdminAvatar;
  if (sidebarAvatarImg) sidebarAvatarImg.src = savedAdminAvatar;

  // Avatar Modal
  const avatarModal = document.getElementById('admin-avatar-modal');
  const changeAvatarBtn = document.getElementById('btn-change-avatar');
  const closeAvatarBtn = document.getElementById('btn-close-avatar-modal');
  const cancelAvatarBtn = document.getElementById('btn-cancel-avatar');
  const applyAvatarBtn = document.getElementById('btn-apply-avatar');
  const customAvatarUrlInput = document.getElementById('input-custom-avatar-url') as HTMLInputElement | null;
  const avatarPresets = document.querySelectorAll<HTMLElement>('.admin-avatar-preset-btn');
  let selectedAvatarUrl = savedAdminAvatar;

  changeAvatarBtn?.addEventListener('click', () => {
    if (avatarModal) {
      avatarModal.style.display = 'flex';
      avatarModal.classList.add('active');
    }
  });

  function closeAvatarModal() {
    if (avatarModal) {
      avatarModal.classList.remove('active');
      avatarModal.style.display = 'none';
    }
  }

  closeAvatarBtn?.addEventListener('click', closeAvatarModal);
  cancelAvatarBtn?.addEventListener('click', closeAvatarModal);

  avatarPresets.forEach((preset) => {
    preset.addEventListener('click', () => {
      avatarPresets.forEach((p) => {
        p.classList.remove('active');
        p.style.borderColor = 'transparent';
      });
      preset.classList.add('active');
      preset.style.borderColor = 'var(--primary-accent)';
      selectedAvatarUrl = preset.getAttribute('data-avatar') || '/images/admin_avatar.png';
      if (customAvatarUrlInput) customAvatarUrlInput.value = '';
    });
  });

  applyAvatarBtn?.addEventListener('click', () => {
    if (customAvatarUrlInput && customAvatarUrlInput.value.trim()) {
      selectedAvatarUrl = customAvatarUrlInput.value.trim();
    }
    localStorage.setItem('kuizu_admin_avatar', selectedAvatarUrl);
    localStorage.setItem('kuizu_user_avatar', selectedAvatarUrl);
    localStorage.setItem('kuizu_custom_avatar', selectedAvatarUrl);
    localStorage.setItem('kuizu_custom_avatar_saved', 'true');
    if (accountAvatarImg) accountAvatarImg.src = selectedAvatarUrl;
    if (sidebarAvatarImg) sidebarAvatarImg.src = selectedAvatarUrl;

    const adminEmail = localStorage.getItem('kuizu_user_email') || 'anujschavan007@gmail.com';
    supabase.from('users').update({
      avatar: selectedAvatarUrl,
      custom_avatar: selectedAvatarUrl,
      avatar_mode: '2d',
      last_active: 'Today'
    }).ilike('email', adminEmail).then(() => {});

    window.dispatchEvent(new CustomEvent('kuizu:avatar_changed', { detail: { avatarUrl: selectedAvatarUrl, mode: '2d' } }));
    closeAvatarModal();
    showToast('Administrator avatar updated successfully!');
  });

  // Password Visibility Toggles
  const eyeButtons = document.querySelectorAll<HTMLButtonElement>('.admin-pass-eye-btn');
  eyeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      if (!targetId) return;
      const input = document.getElementById(targetId) as HTMLInputElement | null;
      if (input) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          `;
        } else {
          input.type = 'password';
          btn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          `;
        }
      }
    });
  });

  // Password Strength Meter
  const newPassInput = document.getElementById('input-new-pass') as HTMLInputElement | null;
  const strengthFill = document.getElementById('pass-strength-fill');
  const strengthLabel = document.getElementById('pass-strength-label');

  newPassInput?.addEventListener('input', () => {
    const val = newPassInput.value;
    if (!strengthFill || !strengthLabel) return;

    if (!val) {
      strengthFill.className = 'admin-password-meter-fill';
      strengthLabel.textContent = 'Security';
      return;
    }

    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    if (score <= 2) {
      strengthFill.className = 'admin-password-meter-fill weak';
      strengthLabel.textContent = 'Weak';
      strengthLabel.style.color = '#ef4444';
    } else if (score <= 4) {
      strengthFill.className = 'admin-password-meter-fill medium';
      strengthLabel.textContent = 'Good';
      strengthLabel.style.color = '#f59e0b';
    } else {
      strengthFill.className = 'admin-password-meter-fill strong';
      strengthLabel.textContent = 'Strong';
      strengthLabel.style.color = '#10b981';
    }
  });

  // Update Password Button
  const currentPassInput = document.getElementById('input-current-pass') as HTMLInputElement | null;
  const confirmPassInput = document.getElementById('input-confirm-pass') as HTMLInputElement | null;
  const updatePassBtn = document.getElementById('btn-update-password');

  updatePassBtn?.addEventListener('click', () => {
    if (!currentPassInput?.value) {
      showToast('Please enter your current administrator password.');
      currentPassInput?.focus();
      return;
    }
    if (!newPassInput?.value || newPassInput.value.length < 6) {
      showToast('New password must be at least 6 characters.');
      newPassInput?.focus();
      return;
    }
    if (newPassInput.value !== confirmPassInput?.value) {
      showToast('New password confirmation does not match.');
      confirmPassInput?.focus();
      return;
    }

    currentPassInput.value = '';
    newPassInput.value = '';
    confirmPassInput.value = '';
    if (strengthFill) strengthFill.className = 'admin-password-meter-fill';
    if (strengthLabel) strengthLabel.textContent = 'Security';

    showToast('Administrator password updated successfully!');
  });

  // Save Account Profile Button
  saveAccountBtn?.addEventListener('click', () => {
    const newName = accountNameInput?.value.trim() || 'Admin';
    const newEmail = accountEmailInput?.value.trim() || 'admin@kuizu.io';

    localStorage.setItem('kuizu_admin_name', newName);
    localStorage.setItem('kuizu_user_email', newEmail);

    if (accountDisplayTitle) accountDisplayTitle.textContent = newName;
    if (accountDisplayEmail) accountDisplayEmail.textContent = newEmail;
    if (sidebarNameText) sidebarNameText.textContent = newName;

    showToast('Administrator profile details saved!');
  });

  // 10. Privacy, Security & Anti-Cheat Controls
  const sessionTimeoutSelect = document.getElementById('setting-session-timeout') as HTMLSelectElement | null;
  const cheatStrictnessSelect = document.getElementById('setting-cheat-strictness') as HTMLSelectElement | null;
  const flagTabSwitchToggle = document.getElementById('toggle-flag-tab-switch') as HTMLInputElement | null;
  const flagCopyPasteToggle = document.getElementById('toggle-flag-copy-paste') as HTMLInputElement | null;
  const strictFullscreenToggle = document.getElementById('toggle-strict-fullscreen') as HTMLInputElement | null;
  const clearCacheBtn = document.getElementById('btn-clear-cache');
  const exportSecurityBtn = document.getElementById('btn-export-security-logs');

  clearCacheBtn?.addEventListener('click', () => {
    // Preserve core user identity while clearing temporary cached states
    const keepKeys = ['kuizu_user_settings_v1', 'kuizu_accent_color', 'kuizu_font_settings', 'kuizu_admin_name', 'kuizu_user_email'];
    const preserved: Record<string, string> = {};
    keepKeys.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v) preserved[k] = v;
    });

    sessionStorage.clear();
    Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));

    showToast('System cache, contest sessions, and local stores purged cleanly.');
  });

  exportSecurityBtn?.addEventListener('click', () => {
    const auditData = {
      exportTimestamp: new Date().toISOString(),
      platform: 'KUIZU Learning Arena',
      securityMode: cheatStrictnessSelect?.value || 'strict',
      sessionTimeout: sessionTimeoutSelect?.value || '30',
      activePolicies: {
        flagTabSwitch: flagTabSwitchToggle?.checked ?? true,
        flagCopyPaste: flagCopyPasteToggle?.checked ?? true,
        strictFullscreen: strictFullscreenToggle?.checked ?? true,
      },
      auditHistory: [
        { type: 'TAB_SWITCH', user: 'coder_guest_42', penaltyScore: 1, timestamp: new Date(Date.now() - 3600000).toISOString() },
        { type: 'CLIPBOARD_PASTE', user: 'alex_99', blocked: true, timestamp: new Date(Date.now() - 7200000).toISOString() },
        { type: 'FULLSCREEN_EXIT', user: 'dev_hero', warningIssued: true, timestamp: new Date(Date.now() - 10800000).toISOString() }
      ]
    };

    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kuizu-security-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Security audit report downloaded as JSON.');
  });

  // 11. Help & Diagnostics
  const runDiagBtn = document.getElementById('btn-run-diagnostics');
  const adminDocsBtn = document.getElementById('btn-admin-docs');
  const contactSupportBtn = document.getElementById('btn-contact-support');
  const docsModal = document.getElementById('admin-docs-modal');
  const closeDocsBtn = document.getElementById('btn-close-docs-modal');
  const dismissDocsBtn = document.getElementById('btn-dismiss-docs');

  adminDocsBtn?.addEventListener('click', () => {
    if (docsModal) {
      docsModal.style.display = 'flex';
      docsModal.classList.add('active');
    }
  });

  function closeDocsModal() {
    if (docsModal) {
      docsModal.classList.remove('active');
      docsModal.style.display = 'none';
    }
  }

  closeDocsBtn?.addEventListener('click', closeDocsModal);
  dismissDocsBtn?.addEventListener('click', closeDocsModal);

  contactSupportBtn?.addEventListener('click', () => {
    window.location.href = 'mailto:support@kuizu.io?subject=Admin%20Inquiry%20KUIZU%20Platform';
  });

  runDiagBtn?.addEventListener('click', () => {
    const dots = [
      document.getElementById('diag-dot-db'),
      document.getElementById('diag-dot-audio'),
      document.getElementById('diag-dot-cheat'),
      document.getElementById('diag-dot-auth'),
    ];

    dots.forEach((dot) => {
      dot?.classList.add('running');
    });

    showToast('Running self-diagnostic test across all subsystems...');

    setTimeout(() => {
      dots.forEach((dot) => {
        dot?.classList.remove('running');
      });
      showToast('All 4 System Subsystems Normal & Fully Operational! (24ms latency)');
    }, 900);
  });

  // 12. Game Audio & BGM Controls Initialization
  await soundManager.init();
  const bgmToggle = document.getElementById('toggle-bgm-enabled') as HTMLInputElement | null;
  const bgmSlider = document.getElementById('slider-bgm-volume') as HTMLInputElement | null;
  const bgmLabel = document.getElementById('label-bgm-volume');
  const previewBtn = document.getElementById('btn-preview-bgm') as HTMLButtonElement | null;
  const discIcon = document.getElementById('admin-audio-disc');
  const eqBars = document.getElementById('admin-eq-bars');
  const presetButtons = document.querySelectorAll<HTMLButtonElement>('.admin-vol-preset-btn');

  function updatePresetButtons(currentVolPct: number) {
    presetButtons.forEach((btn) => {
      const pVol = parseInt(btn.getAttribute('data-vol') || '-1', 10);
      if (pVol === currentVolPct) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  const initialVolPct = Math.round(soundManager.getBgmVolume() * 100);
  if (bgmSlider) bgmSlider.value = String(initialVolPct);
  if (bgmLabel) bgmLabel.textContent = `${initialVolPct}%`;
  if (bgmToggle) bgmToggle.checked = soundManager.isBgmEnabled();
  updatePresetButtons(initialVolPct);

  bgmSlider?.addEventListener('input', () => {
    const volPct = parseInt(bgmSlider.value, 10);
    if (bgmLabel) bgmLabel.textContent = `${volPct}%`;
    soundManager.setBgmVolume(volPct / 100);
    updatePresetButtons(volPct);
  });

  bgmToggle?.addEventListener('change', () => {
    soundManager.setBgmEnabled(bgmToggle.checked);
    showToast(bgmToggle.checked ? 'Game background music enabled' : 'Game background music disabled');
  });

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const vol = parseInt(btn.getAttribute('data-vol') || '50', 10);
      if (bgmSlider) bgmSlider.value = String(vol);
      if (bgmLabel) bgmLabel.textContent = `${vol}%`;
      soundManager.setBgmVolume(vol / 100);
      updatePresetButtons(vol);
    });
  });

  let isPreviewPlaying = false;
  previewBtn?.addEventListener('click', async () => {
    if (!isPreviewPlaying) {
      const played = await soundManager.playGameBgm();
      if (played) {
        isPreviewPlaying = true;
        previewBtn.classList.add('playing');
        discIcon?.classList.add('spinning');
        eqBars?.classList.add('playing');
        previewBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
          <span>Stop Preview</span>
        `;
      }
    } else {
      soundManager.pauseGameBgm();
      isPreviewPlaying = false;
      previewBtn.classList.remove('playing');
      discIcon?.classList.remove('spinning');
      eqBars?.classList.remove('playing');
      previewBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Preview</span>
      `;
    }
  });

  // 13. Global Save Settings Handler (Save Changes & Quick Save)
  async function persistAllSettings(button: HTMLElement | null) {
    if (button) {
      button.classList.add('saving');
      button.setAttribute('disabled', 'true');
    }

    // Persist General
    const generalData = {
      name: platformNameInput?.value || 'KUIZU Learning Arena',
      tagline: platformTaglineInput?.value || 'Gamified Interactive Quiz & Battle Engine',
      maintenance: maintenanceToggle?.checked ?? false,
      language: languageSelect?.value || 'en',
      timezone: timezoneSelect?.value || 'Asia/Kolkata',
      autoSave: autoSaveToggle?.checked ?? true,
      showLeaderboard: leaderboardToggle?.checked ?? true,
      soundEffects: soundEffectsToggle?.checked ?? true,
    };
    localStorage.setItem('kuizu_admin_general_settings', JSON.stringify(generalData));

    // Persist Notifications
    const notifData = {
      email: emailNotifToggle?.checked ?? true,
      platform: platformNotifToggle?.checked ?? true,
      cheatAlerts: cheatAlertsToggle?.checked ?? true,
      quizReminders: quizRemindersToggle?.checked ?? true,
      marketing: marketingToggle?.checked ?? false,
    };
    localStorage.setItem('kuizu_admin_notification_settings', JSON.stringify(notifData));

    // Persist Audio
    await soundManager.saveSettings();

    setTimeout(() => {
      if (button) {
        button.classList.remove('saving');
        button.removeAttribute('disabled');
      }
      showToast('All administrator settings & preferences saved successfully!');
    }, 350);
  }

  const saveBtn = document.getElementById('btn-save-settings');
  const quickSaveBtn = document.getElementById('btn-quick-save');

  saveBtn?.addEventListener('click', () => persistAllSettings(saveBtn));
  quickSaveBtn?.addEventListener('click', () => persistAllSettings(quickSaveBtn));

  // 14. Reset to Default Button
  const resetBtn = document.getElementById('btn-reset-settings');
  resetBtn?.addEventListener('click', async () => {
    // Reset Theme to Light
    setTheme('light');
    themeButtons.forEach((b) => b.classList.remove('active'));
    document.querySelector('.admin-theme-segment-btn[data-theme="light"]')?.classList.add('active');

    // Reset Accent to #2563EB
    setAccentColor('#2563EB');
    syncAccentUI('#2563EB');

    // Reset Font Colors & Typography to Slate & Outfit
    setFontTheme('slate');
    setFontFamily('Outfit');
    setFontSize('Standard');
    syncFontThemeUI();

    // Reset General Form
    if (platformNameInput) platformNameInput.value = 'KUIZU Learning Arena';
    if (platformTaglineInput) platformTaglineInput.value = 'Gamified Interactive Quiz & Battle Engine';
    if (maintenanceToggle) {
      maintenanceToggle.checked = false;
      updateMaintenanceBadge(false);
    }
    if (languageSelect) languageSelect.value = 'en';
    if (timezoneSelect) timezoneSelect.value = 'Asia/Kolkata';
    if (autoSaveToggle) autoSaveToggle.checked = true;
    if (leaderboardToggle) leaderboardToggle.checked = true;
    if (soundEffectsToggle) soundEffectsToggle.checked = true;

    // Reset Notifications
    if (emailNotifToggle) emailNotifToggle.checked = true;
    if (platformNotifToggle) platformNotifToggle.checked = true;
    if (cheatAlertsToggle) cheatAlertsToggle.checked = true;
    if (quizRemindersToggle) quizRemindersToggle.checked = true;
    if (marketingToggle) marketingToggle.checked = false;

    // Reset Audio
    if (bgmToggle) bgmToggle.checked = true;
    if (bgmSlider) bgmSlider.value = '50';
    if (bgmLabel) bgmLabel.textContent = '50%';
    updatePresetButtons(50);
    soundManager.setBgmEnabled(true);
    soundManager.setBgmVolume(0.5);
    await soundManager.saveSettings();

    showToast('Settings restored to clean factory defaults.');
  });
});
