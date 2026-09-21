/** Uložený souhlas s cookies (GDPR / ePrivacy). */
export type CookieConsent = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  date: string;
  version: number;
};

export const CONSENT_KEY = 'cookie-consent';
export const CONSENT_VERSION = 1;
const CONSENT_EVENT = 'cookie-consent-change';

export function readConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed?.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConsent(value: Omit<CookieConsent, 'necessary' | 'date' | 'version'>) {
  const consent: CookieConsent = {
    necessary: true,
    ...value,
    date: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    /* storage may be unavailable */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
  return consent;
}

/** Otevře nastavení cookies z libovolného místa (odkaz v patičce). */
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent('cookie-consent-open'));
}

export function onConsentChange(handler: (c: CookieConsent) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<CookieConsent>).detail);
  window.addEventListener(CONSENT_EVENT, listener);
  return () => window.removeEventListener(CONSENT_EVENT, listener);
}
