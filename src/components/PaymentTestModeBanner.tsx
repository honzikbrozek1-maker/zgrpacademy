import { useT } from '@/lib/i18n';

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  const t = useT();
  if (!clientToken) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-sm text-destructive">
        {t('Produkční platby nejsou v této verzi aplikace nastavené. Dokončete nastavení plateb a aplikaci znovu publikujte.')}
      </div>
    );
  }

  if (!clientToken?.startsWith("pk_test_")) return null;

  return (
    <div className="w-full bg-orange-100 border-b border-orange-300 px-4 py-2 text-center text-sm text-orange-800">
      {t('Všechny platby v náhledu jsou v testovacím režimu. Použij kartu 4242 4242 4242 4242.')}
    </div>
  );
}
