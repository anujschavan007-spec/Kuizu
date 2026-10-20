/**
 * Compiler Theme and Settings Manager
 * Connects user settings (Monokai, VS Code Dark, GitHub Light, Dracula, One Dark, font size)
 * across Q-Library Problem Compiler and Contest Arena.
 */

export interface CompilerSettings {
  editorTheme: string;
  fontSize: string;
  defaultLanguage: string;
  autoSaveCode: boolean;
}

const SETTINGS_KEY = 'kuizu_user_settings_v1';

export function getCompilerSettings(): CompilerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.learning) {
        return {
          editorTheme: parsed.learning.editorTheme || 'Monokai',
          fontSize: parsed.learning.fontSize || 'Medium',
          defaultLanguage: parsed.learning.defaultLanguage || 'C++',
          autoSaveCode: parsed.learning.autoSaveCode ?? true
        };
      }
    }
  } catch {}
  return {
    editorTheme: 'Monokai',
    fontSize: 'Medium',
    defaultLanguage: 'C++',
    autoSaveCode: true
  };
}

export function saveCompilerTheme(theme: string): void {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed.learning) parsed.learning = {};
    parsed.learning.editorTheme = theme;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {}
}

export function applyCompilerTheme(targetEl: HTMLElement | null, editorTheme?: string, fontSize?: string): void {
  if (!targetEl) return;
  const settings = getCompilerSettings();
  const theme = editorTheme || settings.editorTheme || 'Monokai';
  const size = fontSize || settings.fontSize || 'Medium';

  targetEl.classList.remove(
    'theme-monokai',
    'theme-vs-code-dark',
    'theme-vscode-dark',
    'theme-github-light',
    'theme-dracula',
    'theme-one-dark'
  );
  targetEl.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');

  const slug = theme.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  targetEl.classList.add(`theme-${slug}`);
  targetEl.classList.add(`font-size-${size.toLowerCase()}`);
}
