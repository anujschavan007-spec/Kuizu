/**
 * Global Theme & Accent Color Manager for KUIZU
 * Synchronizes and applies user accent colors and dark/light mode across all pages.
 */

export function hexToRgba(hex: string, alpha: number): string {
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

export function adjustBrightness(hex: string, percent: number): string {
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

export function getActiveAccentColor(): string {
  try {
    const fast = localStorage.getItem('kuizu_accent_color');
    if (fast) return fast;
    const raw = localStorage.getItem('kuizu_user_settings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.accentColor) return parsed.accentColor;
    }
  } catch (_) {}
  return '#2563EB';
}

export function getActiveTheme(): 'light' | 'dark' | 'system' {
  try {
    const raw = localStorage.getItem('kuizu_user_settings_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.theme) return parsed.theme;
    }
  } catch (_) {}
  return 'light';
}

export function applyGlobalThemeAndAccent(): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const color = getActiveAccentColor();
  const theme = getActiveTheme();

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark-mode');
    document.body?.classList.add('dark-mode');
  } else {
    root.classList.remove('dark-mode');
    document.body?.classList.remove('dark-mode');
  }

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

  updateBackgroundImages(isDark);
}

export function updateBackgroundImages(isDark: boolean): void {
  if (typeof document === 'undefined') return;

  const homeLandscapeImgs = document.querySelectorAll<HTMLImageElement>('.home-landscape-img');
  homeLandscapeImgs.forEach((img) => {
    const target = isDark ? '/images/home_landscape_dark.png' : '/images/home_landscape.png';
    if (img.getAttribute('src') !== target) img.src = target;
  });

  const settingsMtnImgs = document.querySelectorAll<HTMLImageElement>('.settings-mountains-art');
  settingsMtnImgs.forEach((img) => {
    const target = isDark ? '/images/settings_mountains_dark.png' : '/images/settings_mountains.png';
    if (img.getAttribute('src') !== target) img.src = target;
  });

  const quizMapImgs = document.querySelectorAll<HTMLImageElement>('.quiz-map-base-art');
  quizMapImgs.forEach((img) => {
    const target = isDark ? '/images/quiz_clean_map_bg_dark.png' : '/images/quiz_clean_map_bg.jpg';
    if (img.getAttribute('src') !== target) img.src = target;
  });
}

export function setTheme(theme: 'light' | 'dark' | 'system'): void {
  try {
    let settings: any = {};
    const raw = localStorage.getItem('kuizu_user_settings_v1');
    if (raw) {
      try { settings = JSON.parse(raw); } catch (_) {}
    }
    settings.theme = theme;
    localStorage.setItem('kuizu_user_settings_v1', JSON.stringify(settings));
  } catch (_) {}
  applyGlobalThemeAndAccent();
}

export function toggleTheme(): 'light' | 'dark' {
  const current = getActiveTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

export function setAccentColor(color: string): void {
  try {
    localStorage.setItem('kuizu_accent_color', color);
    let settings: any = {};
    const raw = localStorage.getItem('kuizu_user_settings_v1');
    if (raw) {
      try { settings = JSON.parse(raw); } catch (_) {}
    }
    settings.accentColor = color;
    localStorage.setItem('kuizu_user_settings_v1', JSON.stringify(settings));
  } catch (_) {}
  applyGlobalThemeAndAccent();
}

// Immediately apply synchronously upon loading
applyGlobalThemeAndAccent();

// Re-apply when DOM is ready and setup interactive theme button delegation
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyGlobalThemeAndAccent();
      setupGlobalThemeListeners();
    });
  } else {
    applyGlobalThemeAndAccent();
    setupGlobalThemeListeners();
  }
}

function setupGlobalThemeListeners(): void {
  // Delegate clicks on theme switcher buttons across any page
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest('#btn-menu-theme, #btn-theme-toggle, .btn-menu-theme, [data-action="toggle-theme"]');
    if (target) {
      e.preventDefault();
      e.stopPropagation();
      const newTheme = toggleTheme();
      const toast = document.createElement('div');
      toast.className = 'toast-notice';
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1e293b;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.25);transition:opacity 0.3s ease;';
      toast.textContent = `Switched to ${newTheme.toUpperCase()} theme`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  });
}

// Cross-tab and live storage synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'kuizu_accent_color' || e.key === 'kuizu_user_settings_v1') {
      applyGlobalThemeAndAccent();
    }
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getActiveTheme() === 'system') {
        applyGlobalThemeAndAccent();
      }
    });
  }
}

