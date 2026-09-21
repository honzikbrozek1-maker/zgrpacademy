import { Link } from 'react-router-dom';
import { useT } from '@/lib/i18n';
import { openCookieSettings } from '@/lib/cookieConsent';

/** Patička s povinnými právními odkazy. */
export default function LegalFooter({ className }: { className?: string }) {
  const t = useT();
  return (
    <footer className={`border-t py-6 text-center text-xs text-muted-foreground ${className ?? ''}`}>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4">
        <Link to="/ochrana-osobnich-udaju" className="hover:underline">
          {t('Ochrana osobních údajů')}
        </Link>
        <Link to="/cookies" className="hover:underline">
          {t('Zásady cookies')}
        </Link>
        <Link to="/obchodni-podminky" className="hover:underline">
          {t('Obchodní podmínky')}
        </Link>
        <button type="button" onClick={openCookieSettings} className="hover:underline">
          {t('Nastavení cookies')}
        </button>
      </div>
      <p className="mt-3 px-4">
        {t('Zinzinogroup z.s., IČO 08720746, Jaurisova 515/4, 140 00 Praha 4 · info@zinzinogroup.com')}
      </p>
    </footer>
  );
}
