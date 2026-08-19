import { useLang } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={cn('inline-flex items-center rounded-lg border p-0.5 text-xs font-medium', className)}
      role="group"
      aria-label={lang === 'sk' ? 'Voľba jazyka' : 'Volba jazyka'}
    >
      {(['cs', 'sk'] as const).map(code => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'px-2 py-1 rounded-md transition-colors min-w-[34px]',
            lang === code ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          {code === 'cs' ? 'CZ' : 'SK'}
        </button>
      ))}
    </div>
  );
}
