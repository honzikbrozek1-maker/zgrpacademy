import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAppPath } from '@/lib/pathContext';
import { useAuth } from '@/lib/auth';
import { useT, useLang, pickLang } from '@/lib/i18n';
import {
  BookOpen,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutGrid,
  RefreshCw,
  Shield,
  UserCog,
} from 'lucide-react';

interface LevelRow {
  id: string;
  title: string;
  title_sk?: string | null;
  order_index: number;
  group_id: string | null;
}

interface GroupRow {
  id: string;
  title: string;
  title_sk?: string | null;
}

interface QuestionRow {
  id: string;
  question_text: string;
  level_id: string | null;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export default function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const t = useT();
  const { lang } = useLang();
  const { basePath, category } = useAppPath();
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const [{ data: levelData }, { data: groupData }] = await Promise.all([
        supabase
          .from('levels')
          .select('id, title, title_sk, order_index, group_id')
          .eq('category', category)
          .order('order_index'),
        supabase.from('level_groups').select('id, title, title_sk').eq('category', category).order('order_index'),
      ]);
      if (cancelled) return;
      setLevels(levelData ?? []);
      setGroups(groupData ?? []);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, category]);

  // Questions are fetched lazily once the user actually types something.
  useEffect(() => {
    if (!open || questionsLoaded || query.trim().length < 3 || levels.length === 0) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.rpc('get_practice_questions', {
        p_level_ids: levels.map(l => l.id),
        p_lang: lang,
      });
      if (cancelled) return;
      setQuestions(
        (data ?? []).map((q: { id: string; question_text: string; level_id: string | null }) => ({
          id: q.id,
          question_text: q.question_text,
          level_id: q.level_id,
        })),
      );
      setQuestionsLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, query, questionsLoaded, levels, lang]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const go = useCallback(
    (path: string) => {
      onOpenChange(false);
      navigate(path);
    },
    [navigate, onOpenChange],
  );

  const q = normalize(query.trim());

  const pages = useMemo(() => {
    const items = [
      { label: t('Přehled (dashboard)'), path: basePath, icon: Home },
      { label: t('Levely'), path: `${basePath}/levels`, icon: BookOpen },
      { label: t('Opakování'), path: `${basePath}/review`, icon: RefreshCw },
      { label: t('Certifikáty'), path: `${basePath}/diplomas`, icon: GraduationCap },
      { label: t('Nastavení účtu'), path: `${basePath}/account`, icon: UserCog },
      { label: t('Výběr sekce'), path: '/', icon: LayoutGrid },
      {
        label: category === 'products' ? t('Přepnout na Backoffice') : t('Přepnout na Produkty'),
        path: category === 'products' ? '/backoffice' : '/products',
        icon: LayoutGrid,
      },
    ];
    if (isAdmin) items.push({ label: t('Administrace'), path: `${basePath}/admin`, icon: Shield });
    return items;
  }, [basePath, category, isAdmin, t]);

  const filteredPages = q ? pages.filter(p => normalize(p.label).includes(q)) : pages;
  const filteredLevels = q ? levels.filter(l => normalize(pickLang(l, 'title', lang)).includes(q)).slice(0, 8) : [];
  const filteredGroups = q ? groups.filter(g => normalize(pickLang(g, 'title', lang)).includes(q)).slice(0, 5) : [];
  const filteredQuestions = q.length >= 3
    ? questions.filter(qu => normalize(qu.question_text).includes(q)).slice(0, 8)
    : [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('Hledat stránky, levely a otázky…')} value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>{t('Nic nenalezeno.')}</CommandEmpty>

        {filteredPages.length > 0 && (
          <CommandGroup heading={t('Stránky')}>
            {filteredPages.map(page => (
              <CommandItem key={page.path + page.label} value={`page-${page.label}`} onSelect={() => go(page.path)}>
                <page.icon className="mr-2 h-4 w-4" />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredLevels.length > 0 && (
          <CommandGroup heading={t('Levely')}>
            {filteredLevels.map(level => (
              <CommandItem
                key={level.id}
                value={`level-${level.id}`}
                onSelect={() => go(`${basePath}/level/${level.id}`)}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {level.order_index}. {pickLang(level, 'title', lang)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredGroups.length > 0 && (
          <CommandGroup heading={t('Skupiny')}>
            {filteredGroups.map(group => (
              <CommandItem key={group.id} value={`group-${group.id}`} onSelect={() => go(`${basePath}/levels`)}>
                <GraduationCap className="mr-2 h-4 w-4" />
                {pickLang(group, 'title', lang)}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredQuestions.length > 0 && (
          <CommandGroup heading={t('Otázky')}>
            {filteredQuestions.map(question => {
              const level = levels.find(l => l.id === question.level_id);
              return (
                <CommandItem
                  key={question.id}
                  value={`question-${question.id}`}
                  onSelect={() => go(question.level_id ? `${basePath}/level/${question.level_id}` : `${basePath}/levels`)}
                >
                  <HelpCircle className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {question.question_text}
                    {level && <span className="text-muted-foreground"> — {pickLang(level, 'title', lang)}</span>}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
