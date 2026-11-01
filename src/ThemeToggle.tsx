import { themeToggleLabel, type Theme } from './theme';

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return <button className="theme-toggle" type="button" aria-label={themeToggleLabel(theme)} aria-pressed={theme === 'dark'} title={themeToggleLabel(theme)} onClick={onToggle}>
    <svg className="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.3 15.3A8.4 8.4 0 0 1 8.7 3.7 8.4 8.4 0 1 0 20.3 15.3Z" /></svg>
    <svg className="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
  </button>;
}
