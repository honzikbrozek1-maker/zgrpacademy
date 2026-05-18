import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, CheckCircle, ArrowRight, Trophy, GraduationCap } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getAvailableModulesFromQuestionTypes, getLevelProgressPercent } from '@/lib/levelProgress';

interface Level {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  passing_score: number;
  group_id: string | null;
}

interface Group {
  id: string;
  title: string;
  description: string | null;
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
  const [groups, setGroups] = useState<Group[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState<UserProgressRow[]>([]);
  const [groupProgress, setGroupProgress] = useState<GroupProgressRow[]>([]);
  const [diplomaGroupIds, setDiplomaGroupIds] = useState<Set<string>>(new Set());
  const [levelQuestionTypes, setLevelQuestionTypes] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
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
        supabase.from('questions_safe').select('level_id, type').in('level_id', levelIds).eq('in_practice', true),
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
    })();
  }, [user, category]);

  const getLevelProgress = (id: string) => progress.find(p => p.level_id === id);
  const getGroupProgress = (id: string) => groupProgress.find(p => p.group_id === id);

  const isGroupUnlocked = (group: Group, index: number) => {
    if (index === 0) return true;
    const prev = groups[index - 1];
    if (!prev) return true;
    return getGroupProgress(prev.id)?.passed === true;
  };

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
        <CardContent className="p-4">
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
                <h3 className="font-semibold">{level.title}</h3>
                {level.description && <p className="text-sm text-muted-foreground">{level.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {prog?.completed && prog?.test_score !== null && (
                <Badge variant="secondary" className="bg-success/10 text-success">
                  Test {prog.test_score}%
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
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-slide-up">
        <h1 className="text-2xl font-bold">Levely</h1>

        {groups.map((group, idx) => {
          const unlocked = isGroupUnlocked(group, idx);
          const groupLevels = levels.filter(l => l.group_id === group.id);
          const allLevelsPassed = groupLevels.length > 0 && groupLevels.every(l => getLevelProgress(l.id)?.completed);
          const gp = getGroupProgress(group.id);
          const groupPassed = gp?.passed === true;
          const hasDiploma = diplomaGroupIds.has(group.id);

          return (
            <section key={group.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!unlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  <h2 className="text-lg font-semibold">{group.title}</h2>
                  {groupPassed && (
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      <CheckCircle className="h-3 w-3 mr-1" /> Skupina dokončena
                    </Badge>
                  )}
                </div>
              </div>
              {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
              {!unlocked ? (
                <Card className="shadow-card">
                  <CardContent className="p-6 text-center text-muted-foreground text-sm">
                    Tato skupina se odemkne po úspěšném dokončení předchozí skupiny.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-3">
                    {groupLevels.map(l => renderLevelCard(l, true))}
                    {groupLevels.length === 0 && (
                      <Card className="shadow-card"><CardContent className="p-6 text-center text-muted-foreground text-sm">Ve skupině zatím nejsou levely.</CardContent></Card>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className={`shadow-card transition-all ${allLevelsPassed ? 'cursor-pointer hover:shadow-elevated' : 'opacity-60'} ${groupPassed ? 'ring-2 ring-success/30' : ''}`}
                      onClick={() => allLevelsPassed && navigate(`${basePath}/group/${group.id}/test`)}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allLevelsPassed ? 'bg-primary/15' : 'bg-muted'}`}>
                          {allLevelsPassed ? <Trophy className="h-5 w-5 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">Závěrečný test skupiny</h3>
                          <p className="text-xs text-muted-foreground">
                            {groupPassed
                              ? `Splněno ${gp?.test_score}%`
                              : allLevelsPassed
                                ? `Potřeba ≥ ${group.final_test_passing_score}%`
                                : 'Nejprve dokončete všechny levely'}
                          </p>
                        </div>
                        {allLevelsPassed && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                      </CardContent>
                    </Card>

                    <Card className={`shadow-card transition-all ${hasDiploma ? 'cursor-pointer hover:shadow-elevated ring-2 ring-success/30' : 'opacity-60'}`}
                      onClick={() => hasDiploma && navigate(`${basePath}/diplomas`)}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasDiploma ? 'bg-primary/15' : 'bg-muted'}`}>
                          {hasDiploma ? <GraduationCap className="h-5 w-5 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">Diplom</h3>
                          <p className="text-xs text-muted-foreground">
                            {hasDiploma ? 'Získán — zobrazit v Mých diplomech' : 'Dostupný po splnění závěr. testu skupiny'}
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
            <h2 className="text-lg font-semibold">Ostatní levely</h2>
            <div className="space-y-3">
              {ungrouped.map(l => renderLevelCard(l, true))}
            </div>
          </section>
        )}

        {groups.length === 0 && ungrouped.length === 0 && (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center text-muted-foreground">
              Zatím nejsou k dispozici žádné levely.
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
