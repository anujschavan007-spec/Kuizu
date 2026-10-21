import './services/supabaseApiBridge';

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

export interface FontThemeDefinition {
  id: string;
  name: string;
  lightHeading: string;
  lightBody: string;
  darkHeading: string;
  darkBody: string;
  accent: string;
}

export const FONT_THEMES: Record<string, FontThemeDefinition> = {
  slate: {
    id: 'slate',
    name: 'Classic Slate',
    lightHeading: '#0f172a',
    lightBody: '#334155',
    darkHeading: '#f8fafc',
    darkBody: '#cbd5e1',
    accent: '#2563eb',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Midnight Sapphire',
    lightHeading: '#1e3a8a',
    lightBody: '#1e293b',
    darkHeading: '#93c5fd',
    darkBody: '#bfdbfe',
    accent: '#3b82f6',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Forest',
    lightHeading: '#065f46',
    lightBody: '#134e4a',
    darkHeading: '#6ee7b7',
    darkBody: '#a7f3d0',
    accent: '#10b981',
  },
  amethyst: {
    id: 'amethyst',
    name: 'Royal Amethyst',
    lightHeading: '#581c87',
    lightBody: '#3b0764',
    darkHeading: '#d8b4fe',
    darkBody: '#e9d5ff',
    accent: '#8b5cf6',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Amber',
    lightHeading: '#9a3412',
    lightBody: '#7c2d12',
    darkHeading: '#fdba74',
    darkBody: '#fed7aa',
    accent: '#f97316',
  },
  ruby: {
    id: 'ruby',
    name: 'Crimson Ruby',
    lightHeading: '#9f1239',
    lightBody: '#881337',
    darkHeading: '#fda4af',
    darkBody: '#fecdd3',
    accent: '#f43f5e',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Neon',
    lightHeading: '#0e7490',
    lightBody: '#164e63',
    darkHeading: '#67e8f9',
    darkBody: '#a5f3fc',
    accent: '#06b6d4',
  },
};

export interface FontSettings {
  themeId: string;
  customColor?: string;
  fontFamily: string;
  fontSize: 'Compact' | 'Standard' | 'Spacious';
}

export function getActiveFontSettings(): FontSettings {
  const defaults: FontSettings = {
    themeId: 'slate',
    fontFamily: 'Outfit',
    fontSize: 'Standard',
  };
  try {
    const raw = localStorage.getItem('kuizu_font_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch (_) {}
  return defaults;
}

export function setFontTheme(themeId: string, customColor?: string): void {
  try {
    const current = getActiveFontSettings();
    current.themeId = themeId;
    if (customColor) {
      current.customColor = customColor;
    }
    localStorage.setItem('kuizu_font_settings', JSON.stringify(current));
  } catch (_) {}
  applyGlobalThemeAndAccent();
}

export function setFontFamily(fontFamily: string): void {
  try {
    const current = getActiveFontSettings();
    current.fontFamily = fontFamily;
    localStorage.setItem('kuizu_font_settings', JSON.stringify(current));
  } catch (_) {}
  applyGlobalThemeAndAccent();
}

export function setFontSize(size: 'Compact' | 'Standard' | 'Spacious'): void {
  try {
    const current = getActiveFontSettings();
    current.fontSize = size;
    localStorage.setItem('kuizu_font_settings', JSON.stringify(current));
  } catch (_) {}
  applyGlobalThemeAndAccent();
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

  // Apply Font Theme and Colors
  const fontSettings = getActiveFontSettings();
  root.setAttribute('data-font-theme', fontSettings.themeId || 'slate');
  
  const selectedThemeDef = FONT_THEMES[fontSettings.themeId] || FONT_THEMES.slate;
  let headingColor = isDark ? selectedThemeDef.darkHeading : selectedThemeDef.lightHeading;
  let bodyColor = isDark ? selectedThemeDef.darkBody : selectedThemeDef.lightBody;
  
  if (fontSettings.customColor) {
    headingColor = fontSettings.customColor;
  }
  
  root.style.setProperty('--font-heading-color', headingColor);
  root.style.setProperty('--font-body-color', bodyColor);
  root.style.setProperty('--admin-font-family', `'${fontSettings.fontFamily || 'Outfit'}', 'Plus Jakarta Sans', sans-serif`);
  
  const scaleMap: Record<string, string> = {
    Compact: '14px',
    Standard: '16px',
    Spacious: '18px',
  };
  root.style.setProperty('--admin-font-scale', scaleMap[fontSettings.fontSize] || '16px');

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

  const questCards = document.querySelectorAll<HTMLElement>('.quest-landscape-card, #quest-landscape-map');
  questCards.forEach((card) => {
    card.style.backgroundImage = isDark
      ? "url('/images/quest_clean_bg_dark.png')"
      : "url('/images/quest_clean_bg.jpg')";
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
    if (e.key === 'kuizu_accent_color' || e.key === 'kuizu_user_settings_v1' || e.key === 'kuizu_font_settings') {
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

