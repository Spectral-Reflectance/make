const MEASUREMENT_ID = 'G-J7NQEM2027';
const STORAGE_KEY = 'sr-make-analytics-consent-v1';
const COOKIE_PREFIX = 'sr_make';
const CONSENT_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const DISABLE_KEY = `ga-disable-${MEASUREMENT_ID}`;
let analyticsAllowed = false;

type Choice = 'allow' | 'deny';
type ConsentRecord = { choice: Choice; decidedAt: number };

export function parseConsentRecord(raw: string | null, now = Date.now()): Choice | null {
  if (!raw) return null;
  try {
    const record: unknown = JSON.parse(raw);
    if (!record || typeof record !== 'object') return null;
    const { choice, decidedAt } = record as Partial<ConsentRecord>;
    if ((choice !== 'allow' && choice !== 'deny') || typeof decidedAt !== 'number') return null;
    if (!Number.isFinite(decidedAt) || decidedAt > now || now - decidedAt >= CONSENT_AGE_MS) return null;
    return choice;
  } catch {
    return null;
  }
}

function storedChoice(): Choice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const choice = parseConsentRecord(raw);
    if (raw && !choice) window.localStorage.removeItem(STORAGE_KEY);
    return choice;
  }
  catch { return null; }
}

function saveChoice(choice: Choice): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, decidedAt: Date.now() })); }
  catch { /* A blocked storage API leaves the choice valid for this page only. */ }
}

function analyticsGlobals(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>;
}

function startAnalytics(): void {
  analyticsAllowed = true;
  if (document.getElementById('sr-make-analytics-script')) return;
  const globals = analyticsGlobals();
  globals[DISABLE_KEY] = false;
  const dataLayer: unknown[][] = [];
  globals.dataLayer = dataLayer;
  const gtag = (...args: unknown[]) => dataLayer.push(args);
  globals.gtag = gtag;

  // Queue consent before loading the Google tag; only analytics is granted.
  gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
  });
  gtag('js', new Date());
  gtag('consent', 'update', { analytics_storage: 'granted' });
  gtag('config', MEASUREMENT_ID, {
    cookie_domain: location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? 'none' : location.hostname,
    cookie_prefix: COOKIE_PREFIX,
    cookie_expires: CONSENT_AGE_MS / 1000,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement('script');
  script.id = 'sr-make-analytics-script';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.append(script);
}

export type MakeEventName = 'design_selected' | 'palette_selected' | 'model_download' | 'filament_brand_selected';

export function trackMakeEvent(name: MakeEventName, parameters: Record<string, string>): void {
  if (!analyticsAllowed) return;
  const gtag = analyticsGlobals().gtag;
  if (typeof gtag === 'function') gtag('event', name, parameters);
}

function removeAnalyticsCookies(): void {
  for (const entry of document.cookie.split(';')) {
    const name = entry.trim().split('=')[0];
    if (!name.startsWith(`${COOKIE_PREFIX}_`)) continue;
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${location.hostname}; SameSite=Lax`;
  }
}

function stopAnalytics(): void {
  analyticsAllowed = false;
  analyticsGlobals()[DISABLE_KEY] = true;
  const gtag = analyticsGlobals().gtag;
  if (typeof gtag === 'function') {
    gtag('consent', 'update', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
  }
  removeAnalyticsCookies();
  // A loaded script cannot be unloaded; this guarantees the next page has none.
  window.location.reload();
}

export function mountAnalyticsConsent(): void {
  if (document.getElementById('analytics-consent-banner')) return;
  const footer = document.querySelector<HTMLElement>('.site-footer');
  if (!footer) return;

  let choice = storedChoice();
  const banner = document.createElement('aside');
  banner.id = 'analytics-consent-banner';
  banner.className = 'analytics-consent-banner';
  banner.setAttribute('aria-labelledby', 'analytics-consent-title');
  banner.innerHTML = `
    <div>
      <h2 id="analytics-consent-title">Optional analytics</h2>
      <p>I use Google Analytics to understand how people use Make. It only runs if you agree, and the site works just as well without it.</p>
      <button type="button" class="analytics-text-button analytics-details-link" data-analytics-details>Details</button>
    </div>
    <div class="analytics-consent-actions">
      <button type="button" class="analytics-choice-button" data-analytics-deny>Decline</button>
      <button type="button" class="analytics-choice-button" data-analytics-allow>Allow analytics</button>
    </div>`;
  banner.hidden = choice !== null;
  document.body.append(banner);

  const dialog = document.createElement('dialog');
  dialog.className = 'analytics-consent-dialog';
  dialog.setAttribute('aria-labelledby', 'analytics-dialog-title');
  dialog.innerHTML = `
    <button type="button" class="analytics-dialog-close" data-analytics-close aria-label="Close analytics details">×</button>
    <h2 id="analytics-dialog-title">Analytics on Make</h2>
    <p>If you agree, I use Google Analytics to see how people use Make, including which pages they visit and which files they download. It may also collect approximate location, browser and device information.</p>
    <p>Analytics cookies expire within six months. Your choice is saved in this browser for the same period, and you can change it anytime from the footer.</p>
    <p>Make works just as well without analytics.</p>
    <p>You can read more in <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy Policy</a>.</p>
    <div class="analytics-dialog-actions">
      <button type="button" class="analytics-choice-button" data-analytics-deny>Decline analytics</button>
      <button type="button" class="analytics-choice-button" data-analytics-allow>Allow analytics</button>
    </div>`;
  document.body.append(dialog);

  const footerButton = document.createElement('button');
  footerButton.type = 'button';
  footerButton.className = 'analytics-footer-button';
  footer.insertBefore(footerButton, footer.lastElementChild);
  const updateUi = () => {
    banner.hidden = choice !== null;
    footerButton.textContent = choice === 'allow' ? 'Turn off analytics' : 'Analytics settings';
    footerButton.setAttribute('aria-label', choice === 'allow' ? 'Turn off analytics tracking' : 'Open analytics settings');
  };
  updateUi();

  const choose = (next: Choice) => {
    const wasAllowed = choice === 'allow';
    choice = next;
    saveChoice(next);
    dialog.close();
    updateUi();
    if (next === 'allow') startAnalytics();
    else if (wasAllowed) stopAnalytics();
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-analytics-allow]')) button.addEventListener('click', () => choose('allow'));
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-analytics-deny]')) button.addEventListener('click', () => choose('deny'));
  banner.querySelector('[data-analytics-details]')?.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('[data-analytics-close]')?.addEventListener('click', () => dialog.close());
  footerButton.addEventListener('click', () => {
    if (choice === 'allow') choose('deny');
    else dialog.showModal();
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = storedChoice();
    if (choice === 'allow' && next !== 'allow') {
      choice = next;
      stopAnalytics();
      return;
    }
    choice = next;
    updateUi();
    if (choice === 'allow') startAnalytics();
  });
  if (choice === 'allow') startAnalytics();
}
