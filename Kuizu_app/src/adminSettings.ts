import './adminProfileModal';
import { soundManager } from './services/soundManager';

// Admin Settings Interactive Logic
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Toast Notification Helper
  const toastEl = document.getElementById('admin-toast');
  function showToast(message: string, duration = 3000) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  // 2. Tab Navigation
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.admin-setting-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      
      // If clicking Appearance, Notifications, or Audio, scroll to that card
      if (tabId === 'appearance') {
        document.getElementById('section-appearance')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tabId === 'notifications') {
        document.getElementById('section-notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tabId === 'audio') {
        document.getElementById('section-audio')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (tabId === 'general') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        showToast(`Switched to ${btn.querySelector('span')?.textContent || tabId} tab`);
      }
    });
  });

  // 3. Theme Segmented Group
  const themeButtons = document.querySelectorAll<HTMLButtonElement>('.admin-theme-segment-btn');
  themeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      themeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const selectedTheme = btn.getAttribute('data-theme');
      if (selectedTheme === 'dark') {
        document.documentElement.classList.add('admin-dark-mode');
        showToast('Dark theme enabled');
      } else {
        document.documentElement.classList.remove('admin-dark-mode');
        showToast(`${selectedTheme === 'system' ? 'System' : 'Light'} theme enabled`);
      }
    });
  });

  // 4. Accent Color Selection
  const accentButtons = document.querySelectorAll<HTMLButtonElement>('.admin-accent-color-btn');
  accentButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      accentButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const color = btn.getAttribute('data-color') || '#2563EB';
      document.documentElement.style.setProperty('--primary', color);
      showToast(`Accent color updated`);
    });
  });

  // 5. Game Audio & BGM Controls Initialization
  await soundManager.init();
  const bgmToggle = document.getElementById('toggle-bgm-enabled') as HTMLInputElement | null;
  const bgmSlider = document.getElementById('slider-bgm-volume') as HTMLInputElement | null;
  const bgmLabel = document.getElementById('label-bgm-volume');
  const previewBtn = document.getElementById('btn-preview-bgm') as HTMLButtonElement | null;
  const discIcon = document.getElementById('admin-audio-disc');
  const eqBars = document.getElementById('admin-eq-bars');
  const presetButtons = document.querySelectorAll<HTMLButtonElement>('.admin-vol-preset-btn');

  function updatePresetButtons(currentVolPct: number) {
    presetButtons.forEach(btn => {
      const pVol = parseInt(btn.getAttribute('data-vol') || '-1', 10);
      if (pVol === currentVolPct) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Sync initial values from soundManager
  const initialVolPct = Math.round(soundManager.getBgmVolume() * 100);
  if (bgmSlider) bgmSlider.value = String(initialVolPct);
  if (bgmLabel) bgmLabel.textContent = `${initialVolPct}%`;
  if (bgmToggle) bgmToggle.checked = soundManager.isBgmEnabled();
  updatePresetButtons(initialVolPct);

  // Volume Slider Event
  bgmSlider?.addEventListener('input', () => {
    const volPct = parseInt(bgmSlider.value, 10);
    if (bgmLabel) bgmLabel.textContent = `${volPct}%`;
    soundManager.setBgmVolume(volPct / 100);
    updatePresetButtons(volPct);
  });

  // BGM Enable Toggle Event
  bgmToggle?.addEventListener('change', () => {
    soundManager.setBgmEnabled(bgmToggle.checked);
    showToast(bgmToggle.checked ? 'Game background music enabled' : 'Game background music disabled');
  });

  // Preset Buttons Event
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const vol = parseInt(btn.getAttribute('data-vol') || '50', 10);
      if (bgmSlider) bgmSlider.value = String(vol);
      if (bgmLabel) bgmLabel.textContent = `${vol}%`;
      soundManager.setBgmVolume(vol / 100);
      updatePresetButtons(vol);
    });
  });

  // Preview Button Event
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

  // 6. Reset to Default Button
  const resetBtn = document.getElementById('btn-reset-settings');
  resetBtn?.addEventListener('click', async () => {
    // Reset Theme
    themeButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('.admin-theme-segment-btn[data-theme="light"]')?.classList.add('active');
    document.documentElement.classList.remove('admin-dark-mode');

    // Reset Accent Color
    accentButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('.admin-accent-color-btn[data-color="#2563EB"]')?.classList.add('active');
    document.documentElement.style.setProperty('--primary', '#2563EB');

    // Reset Switches
    const emailToggle = document.getElementById('toggle-email-notif') as HTMLInputElement | null;
    const platformToggle = document.getElementById('toggle-platform-notif') as HTMLInputElement | null;
    const quizToggle = document.getElementById('toggle-quiz-reminders') as HTMLInputElement | null;
    const marketingToggle = document.getElementById('toggle-marketing-updates') as HTMLInputElement | null;
    const autosaveToggle = document.getElementById('toggle-autosave') as HTMLInputElement | null;
    const leaderboardToggle = document.getElementById('toggle-show-leaderboard') as HTMLInputElement | null;
    const soundToggle = document.getElementById('toggle-sound-effects') as HTMLInputElement | null;

    if (emailToggle) emailToggle.checked = true;
    if (platformToggle) platformToggle.checked = true;
    if (quizToggle) quizToggle.checked = false;
    if (marketingToggle) marketingToggle.checked = false;
    if (autosaveToggle) autosaveToggle.checked = true;
    if (leaderboardToggle) leaderboardToggle.checked = true;
    if (soundToggle) soundToggle.checked = true;

    // Reset Selects
    const langSelect = document.getElementById('setting-language') as HTMLSelectElement | null;
    const tzSelect = document.getElementById('setting-timezone') as HTMLSelectElement | null;
    if (langSelect) langSelect.value = 'en';
    if (tzSelect) tzSelect.value = 'Asia/Kolkata';

    // Reset Audio Settings
    if (bgmToggle) bgmToggle.checked = true;
    if (bgmSlider) bgmSlider.value = '50';
    if (bgmLabel) bgmLabel.textContent = '50%';
    updatePresetButtons(50);
    soundManager.setBgmEnabled(true);
    soundManager.setBgmVolume(0.5);
    await soundManager.saveSettings();

    showToast('Settings reset to default values');
  });

  // 7. Save Changes Button
  const saveBtn = document.getElementById('btn-save-settings');
  saveBtn?.addEventListener('click', async () => {
    saveBtn.classList.add('saving');
    saveBtn.setAttribute('disabled', 'true');

    // Save audio settings to backend & localStorage
    await soundManager.saveSettings();

    setTimeout(() => {
      saveBtn.classList.remove('saving');
      saveBtn.removeAttribute('disabled');
      showToast('Settings saved successfully! Game BGM updated.');
    }, 400);
  });
});

