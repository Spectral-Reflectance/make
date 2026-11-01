export type Theme = 'light' | 'dark';

const storageKey = 'sr-make-theme';

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101722' : '#f6f3ef');
  try { localStorage.setItem(storageKey, theme); } catch { /* Browsing without storage still permits a session toggle. */ }
}

export function themeToggleLabel(theme: Theme): string {
  return theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
}
