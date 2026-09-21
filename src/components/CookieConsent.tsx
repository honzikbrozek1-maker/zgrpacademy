import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useT } from '@/lib/i18n';
import { readConsent, saveConsent } from '@/lib/cookieConsent';

export default function CookieConsent() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const stored = readConsent();
    if (!stored) {
      setOpen(true);
    } else {
      setFunctional(stored.functional);
      setAnalytics(stored.analytics);
      setMarketing(stored.marketing);
    }
    const openHandler = () => {
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener('cookie-consent-open', openHandler);
    return () => window.removeEventListener('cookie-consent-open', openHandler);
  }, []);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setDetails(false);
  };

  const acceptAll = () => {
    saveConsent({ functional: true, analytics: true, marketing: true });
    close();
  };

  const rejectOptional = () => {
    saveConsent({ functional: true, analytics: false, marketing: false });
    close();
  };

  const saveSelection = () => {
    saveConsent({ functional, analytics, marketing });
    close();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-4 shadow-elevated">
        <p className="text-sm font-medium">{t('Používáme cookies')}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('Nezbytné cookies potřebujeme pro přihlášení a platbu. Volitelné použijeme jen s vaším souhlasem.')}{' '}
          <Link to="/cookies" className="underline">
            {t('Zásady cookies')}
          </Link>
        </p>

        {details && (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Checkbox checked disabled className="mt-0.5" />
              <div>
                <p className="font-medium">{t('Nezbytné')}</p>
                <p className="text-muted-foreground">{t('Přihlášení, platba a bezpečnost. Nelze vypnout.')}</p>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={functional} onCheckedChange={v => setFunctional(v === true)} className="mt-0.5" />
              <div>
                <p className="font-medium">{t('Funkční')}</p>
                <p className="text-muted-foreground">{t('Jazyk, vzhled, zvuky a uložený postup v procvičování.')}</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={analytics} onCheckedChange={v => setAnalytics(v === true)} className="mt-0.5" />
              <div>
                <p className="font-medium">{t('Analytické')}</p>
                <p className="text-muted-foreground">{t('Anonymní měření návštěvnosti.')}</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={marketing} onCheckedChange={v => setMarketing(v === true)} className="mt-0.5" />
              <div>
                <p className="font-medium">{t('Marketingové')}</p>
                <p className="text-muted-foreground">{t('Reklamní nástroje. Aktuálně nepoužíváme.')}</p>
              </div>
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="min-h-11 flex-1 sm:flex-none" onClick={acceptAll}>
            {t('Přijmout vše')}
          </Button>
          <Button size="sm" variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={rejectOptional}>
            {t('Jen nezbytné')}
          </Button>
          {details ? (
            <Button size="sm" variant="ghost" className="min-h-11" onClick={saveSelection}>
              {t('Uložit výběr')}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="min-h-11" onClick={() => setDetails(true)}>
              {t('Podrobné nastavení')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
