import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/space-grotesk/wght.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles.css';
import { applyTheme, currentTheme, themeToggleLabel } from './theme';
import { mountAnalyticsConsent } from './analyticsConsent';

mountAnalyticsConsent();

const themeToggle = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
if (themeToggle) {
  const syncToggle = () => {
    const theme = currentTheme();
    themeToggle.setAttribute('aria-label', themeToggleLabel(theme));
    themeToggle.setAttribute('title', themeToggleLabel(theme));
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  syncToggle();
  themeToggle.addEventListener('click', () => {
    applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
    syncToggle();
  });
}
