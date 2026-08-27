import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { useT, useLang, pickLang } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle, ArrowRight, Trophy, GraduationCap } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getAvailableModulesFromQuestionTypes, getLevelProgressPercent } from '@/lib/levelProgress';
import Seo from '@/components/Seo';

interface Level {
  id: string;
  title: string;
  title_sk?: string | null;
  description: string | null;
  description_sk?: string | null;
  order_index: number;
  passing_score: number;
  group_id: string | null;
}

interface Group {
  id: string;
  title: string;
  title_sk?: string | null;
  description: string | null;
  description_sk?: string | null;
  order_index: number;
  final_test_passing_score: number;
}

interface UserProgressRow {
  level_id: string;
  completed: boolean;
  test_score: number | null;
  completed_modules: string[];
}

interface GroupProgressRow {
  group_id: string;
  passed: boolean;
  test_score: number | null;
}

export default function Levels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { category, basePath } = useAppPath();
  const t = useT();
  const { lang } = useLang();
  const [groups, setGroups] = useState<Group[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState<UserProgressRow[]>([]);
  const [groupProgress, setGroupProgress] = useState<GroupProgressRow[]>([]);
  const [diplomaGroupIds, setDiplomaGroupIds] = useState<Set<string>>(new Set());
  const [levelQuestionTypes, setLevelQuestionTypes] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    const load = async () => {

      const [groupsRes, levelsRes, gpRes, diplomasRes] = await Promise.all([
        supabase.from('level_groups').select('*').eq('category', category).order('order_index'),
        supabase.from('levels').select('*').eq('category', category).order('order_index'),
        supabase.from('user_group_progress' as any).select('group_id, passed, test_score').eq('user_id', user.id),
        supabase.from('issued_diplomas').select('group_id').eq('user_id', user.id),
      ]);

      setGroups((groupsRes.data || []) as Group[]);
      const lvls = (levelsRes.data || []) as Level[];
      setLevels(lvls);
      setGroupProgress(((gpRes.data as any) || []) as GroupProgressRow[]);
      setDiplomaGroupIds(new Set((diplomasRes.data || []).map((d: any) => d.group_id)));

      if (lvls.length === 0) {
        setProgress([]);
        setLevelQuestionTypes({});
        return;
      }

      const levelIds = lvls.map(l => l.id);
      const [progressRes, questionsRes] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.rpc('get_practice_questions' as any, { p_level_ids: levelIds, p_lang: lang }) as unknown as Promise<{ data: { level_id: string; type: string }[] | null }>,
      ]);

      if (progressRes.data) {
        const set = new Set(levelIds);
        setProgress(progressRes.data
          .filter(item => set.has(item.level_id))
          .map(item => ({
            ...item,
            completed_modules: Array.isArray(item.completed_modules) ? item.completed_modules as string[] : [],
          })));
      } else {
        setProgress([]);
      }

      const map = Object.fromEntries(levelIds.map(id => [id, [] as string[]]));
      for (const q of (questionsRes.data || [])) {
        if (q.level_id) map[q.level_id]?.push(q.type);
      }
      setLevelQuestionTypes(map);
    };
    load();
    const onFocus = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user, category, lang]);


  const getLevelProgress = (id: string) => progress.find(p => p.level_id === id);
  const getGroupProgress = (id: string) => groupProgress.find(p => p.group_id === id);

  // A group unlocks only when EVERY preceding group in the section is passed.
  const isGroupUnlocked = (group: Group, index: number) =>
    groups.slice(0, index).every(g => getGroupProgress(g.id)?.passed === true);

  const getLevelProgressPercentFor = (levelId: string, prog: UserProgressRow | undefined) =>
    getLevelProgressPercent(
      getAvailableModulesFromQuestionTypes(levelQuestionTypes[levelId]),
      prog?.completed_modules,
      Boolean(prog?.completed && prog?.test_score !== null),
    );

  const renderLevelCard = (level: Level, unlocked: boolean) => {
    const prog = getLevelProgress(level.id);
    const percent = getLevelProgressPercentFor(level.id, prog);
    return (
      <Card
        key={level.id}
        className={`shadow-card transition-all ${!unlocked ? 'opacity-60' : 'hover:shadow-elevated cursor-pointer'}`}
        onClick={() => unlocked && navigate(`${basePath}/level/${level.id}`)}
      >
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${unlocked ? 'bg-primary/15' : 'bg-muted'}`}>
                  {unlocked ? (
                    <span className="font-bold text-primary">{level.order_index}</span>
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                {prog?.completed && prog.test_score !== null && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
                    <CheckCircle className="h-3 w-3 text-success-foreground" strokeWidth={3} />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{pickLang(level, 'title', lang)}</h3>
                {level.description && <p className="text-sm text-muted-foreground">{pickLang(level, 'description', lang)}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {prog?.completed && prog?.test_score !== null && (
                <Badge variant="secondary" className="bg-success/10 text-success">
                  {t('Test {score}%', { score: prog.test_score })}
                </Badge>
              )}
              {unlocked && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          {unlocked && (
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all bg-primary/60" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{percent}%</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ungrouped = levels.filter(l => !l.group_id);

  return (
    <AppLayout>
      <Seo
        title={t('Levely a skupiny kurzů – ZGRP Academy')}
        description={t('Přehled všech levelů a skupin kurzů ZGRP Academy včetně postupu a závěrečných testů.')}
        canonical={`https://zgrpacademy.lovable.app${basePath}/levels`}
        ogUrl={`https://zgrpacademy.lovable.app${basePath}/levels`}
      />
      <div className="p-3 md:p-8 max-w-4xl mx-auto space-y-3 md:space-y-8 animate-slide-up">
        <h1 className="text-xl md:text-2xl font-bold">{t('Levely')}</h1>


        {groups.map((group, idx) => {
          const unlocked = isGroupUnlocked(group, idx);
          const groupLevels = levels.filter(l => l.group_id === group.id);
          const allLevelsPassed = groupLevels.length > 0 && groupLevels.every(l => getLevelProgress(l.id)?.completed);
          const gp = getGroupProgress(group.id);
          const groupPassed = gp?.passed === true;
          const hasDiploma = diplomaGroupIds.has(group.id);

          return (
            <section key={group.id} className="space-y-2 md:space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!unlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  <h2 className="text-lg font-semibold">{pickLang(group, 'title', lang)}</h2>
                  {groupPassed && (
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      <CheckCircle className="h-3 w-3 mr-1" /> {t('Skupina dokončena')}
                    </Badge>
                  )}
                </div>
              </div>
              {group.description && <p className="text-sm text-muted-foreground">{pickLang(group, 'description', lang)}</p>}
              {!unlocked ? (
                <Card className="shadow-card">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    {t('Tato skupina se odemkne po úspěšném dokončení předchozí skupiny.')}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-2 md:space-y-3">
                    {groupLevels.map(l => renderLevelCard(l, true))}
                    {groupLevels.length === 0 && (
                      <Card className="shadow-card"><CardContent className="p-6 text-center text-muted-foreground text-sm">{t('Ve skupině zatím nejsou levely.')}</CardContent></Card>
                    )}
                  </div>

                  <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                    <Card className={`shadow-card transition-all ${allLevelsPassed ? 'cursor-pointer hover:shadow-elevated' : 'opacity-60'} ${groupPassed ? 'ring-2 ring-success/30' : ''}`}
                      onClick={() => allLevelsPassed && navigate(`${basePath}/group/${group.id}/test`)}>
                      <CardContent className="p-3 md:p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allLevelsPassed ? 'bg-primary/15' : 'bg-muted'}`}>
                          {allLevelsPassed ? <Trophy className="h-5 w-5 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{t('Závěrečný test skupiny')}</h3>
                          <p className="text-xs text-muted-foreground">
                            {groupPassed
                              ? t('Splněno {score}%', { score: gp?.test_score })
                              : allLevelsPassed
                                ? t('Potřeba ≥ {score}%', { score: group.final_test_passing_score })
                                : t('Nejprve dokončete všechny levely')}
                          </p>
                        </div>
                        {allLevelsPassed && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                      </CardContent>
                    </Card>

                    <Card className={`shadow-card transition-all ${hasDiploma ? 'cursor-pointer hover:shadow-elevated ring-2 ring-success/30' : 'opacity-60'}`}
                      onClick={() => hasDiploma && navigate(`${basePath}/diplomas`)}>
                      <CardContent className="p-3 md:p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasDiploma ? 'bg-primary/15' : 'bg-muted'}`}>
                          {hasDiploma ? <GraduationCap className="h-5 w-5 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{t('Certifikát')}</h3>
                          <p className="text-xs text-muted-foreground">
                            {hasDiploma ? t('Získán — zobrazit v Mých certifikátech') : t('Dostupný po splnění závěr. testu skupiny')}
                          </p>
                        </div>
                        {hasDiploma && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </section>
          );
        })}

        {ungrouped.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t('Ostatní levely')}</h2>
            <div className="space-y-2 md:space-y-3">
              {ungrouped.map(l => renderLevelCard(l, true))}
            </div>
          </section>
        )}

        {groups.length === 0 && ungrouped.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              {t('Zatím nejsou k dispozici žádné levely.')}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
