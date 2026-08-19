import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { sk } from './sk';

export type Lang = 'cs' | 'sk';

const STORAGE_KEY = 'app-language';

function detectLang(): Lang {
  if (typeof window === 'undefined') return 'cs';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'sk' || stored === 'cs') return stored;
  } catch {
    /* storage may be unavailable */
  }
  const langs = [navigator.language, ...(navigator.languages ?? [])];
  return langs.some(l => l?.toLowerCase().startsWith('sk')) ? 'sk' : 'cs';
}

type Vars = Record<string, string | number>;

function interpolate(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (cs: string, vars?: Vars) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'cs',
  setLang: () => {},
  t: (cs, vars) => interpolate(cs, vars),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => detectLang());

  // Load the language stored on the user's profile (cross-device preference).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('profiles').select('language').eq('user_id', user.id).maybeSingle();
      const stored = (data as { language?: string } | null)?.language;
      if (!cancelled && (stored === 'sk' || stored === 'cs')) {
        setLangState(stored);
        try {
          localStorage.setItem(STORAGE_KEY, stored);
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      if (user) {
        supabase.from('profiles').update({ language: next }).eq('user_id', user.id).then(() => {});
      }
    },
    [user],
  );

  const t = useCallback(
    (cs: string, vars?: Vars) => interpolate(lang === 'sk' ? sk[cs] ?? cs : cs, vars),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLang = () => useContext(LanguageContext);

/** Convenience hook: const t = useT(); t('Uložit') */
export function useT() {
  return useContext(LanguageContext).t;
}

/**
 * Picks the localized value of a content field coming from the database.
 * Falls back to the Czech value when the Slovak translation is missing.
 */
export function pickLang(row: object | null | undefined, field: string, lang: Lang): string {
  if (!row) return '';
  const rec = row as Record<string, unknown>;
  const cs = (rec[field] as string | null) ?? '';
  if (lang !== 'sk') return cs;
  const skVal = (rec[`${field}_sk`] as string | null) ?? '';
  return skVal.trim() ? skVal : cs;
}
