import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { useSectionProfile } from '@/hooks/useSectionProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, BookOpen, RotateCcw, ArrowRight, Layers, Lock, CheckCircle, Package, Briefcase } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getAvailableModulesFromQuestionTypes, getLevelProgressPercent } from '@/lib/levelProgress';

interface Level {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface UserProgressRow {
  level_id: string;
  completed: boolean;
  test_score: number | null;
  completed_modules: string[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentPath, category, basePath, pathLabel } = useAppPath();
  const { sectionProfile, refreshSectionProfile } = useSectionProfile(category);
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState<UserProgressRow[]>([]);
  const [levelQuestionTypes, setLevelQuestionTypes] = useState<Record<string, string[]>>({});
  const [reviewCount, setReviewCount] = useState(0);

  const isBackoffice = currentPath === 'backoffice';

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: levelsData } = await supabase.from('levels').select('*').eq('category', category).order('order_index');
      setLevels(levelsData || []);

      if (!levelsData || levelsData.length === 0) {
        setProgress([]);
        setLevelQuestionTypes({});
        setReviewCount(0);
        return;
      }

      const levelIds = levelsData.map((level) => level.id);
      const [{ data: progressData }, { data: questionsData }] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('questions_safe').select('id, level_id, type').in('level_id', levelIds),
      ]);

      const questionTypesMap = Object.fromEntries(levelIds.map((id) => [id, [] as string[]]));
      if (questionsData) {
        for (const question of questionsData) {
          questionTypesMap[question.level_id]?.push(question.type);
        }
      }
      setLevelQuestionTypes(questionTypesMap);

      if (progressData) {
        const levelIdSet = new Set(levelIds);
        setProgress(progressData
          .filter((item) => levelIdSet.has(item.level_id))
          .map((item) => ({
            ...item,
            completed_modules: Array.isArray(item.completed_modules) ? item.completed_modules as string[] : [],
          })));
      } else {
        setProgress([]);
      }

      if (questionsData && questionsData.length > 0) {
        const qIds = questionsData.map((question) => question.id);
          const { count } = await supabase
            .from('review_items')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('question_id', qIds)
            .in('confidence', ['partial', 'unknown']);
        setReviewCount(count || 0);
      } else {
        setReviewCount(0);
      }
    };
    fetchData();
    refreshSectionProfile();
  }, [user, category, refreshSectionProfile]);

  const getLevelProgress = (levelId: string) => progress.find(p => p.level_id === levelId);

  const completedCount = progress.filter(p => p.completed && p.test_score && levels.some(l => l.id === p.level_id)).length;
  const getProgressPercent = (levelId: string, prog: UserProgressRow | undefined) => getLevelProgressPercent(
    getAvailableModulesFromQuestionTypes(levelQuestionTypes[levelId]),
    prog?.completed_modules,
    Boolean(prog?.completed && prog?.test_score !== null),
  );
  const progressPercent = levels.length > 0
    ? Math.round(levels.reduce((sum, level) => sum + getProgressPercent(level.id, getLevelProgress(level.id)), 0) / levels.length)
    : 0;
  // Next level unlocked only after test passed on previous
  const isLevelUnlocked = (level: Level) => {
    if (level.order_index === 1) return true;
    const prevLevel = levels.find(l => l.order_index === level.order_index - 1);
    if (!prevLevel) return true;
    return progress.some(p => p.level_id === prevLevel.id && p.completed && p.test_score !== null);
  };

  const headerIcon = isBackoffice ? <Briefcase className="h-6 w-6 text-primary" /> : <Package className="h-6 w-6 text-primary" />;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up">
        <div className="flex items-center gap-3">
          {headerIcon}
          <div>
            <h1 className="text-2xl font-bold">{pathLabel}</h1>
            <p className="text-sm text-muted-foreground">
              {isBackoffice ? 'Práce s backoffice systémem a systém odměn' : 'Procvičování znalostí o produktech Zinzino'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dokončeno</p>
                <p className="text-lg font-bold">{completedCount}/{levels.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Celkový postup</p>
                <p className="text-lg font-bold">{Math.round(progressPercent)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aktivní sekce</p>
                <p className="text-lg font-bold">{pathLabel}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card cursor-pointer hover:shadow-elevated transition-all" onClick={() => navigate(`${basePath}/review`)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">K procvičení</p>
                <p className="text-lg font-bold">{reviewCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Celkový postup</span>
              <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {reviewCount > 0 && (
          <Link to={`${basePath}/review`}>
            <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-orange-500" />
                  <div>
                    <h3 className="font-semibold text-sm">Procvičování</h3>
                    <p className="text-xs text-muted-foreground">{reviewCount} položek k opakování</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Levely
            </h2>
            <Link to={`${basePath}/levels`}>
              <Button variant="ghost" size="sm">Zobrazit vše <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="space-y-2">
            {levels.map((level) => {
              const unlocked = isLevelUnlocked(level);
              const prog = getLevelProgress(level.id);
              const percent = getProgressPercent(level.id, prog);
              return (
                <Card
                  key={level.id}
                  className={`shadow-card transition-all ${!unlocked ? 'opacity-60' : 'hover:shadow-elevated cursor-pointer'}`}
                  onClick={() => unlocked && navigate(`${basePath}/level/${level.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${
                            unlocked ? 'bg-primary/15 text-primary' : 'bg-muted'
                          }`}>
                            {unlocked ? level.order_index : <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          {prog?.completed && prog.test_score !== null && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
                              <CheckCircle className="h-3 w-3 text-success-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{level.title}</h3>
                          {level.description && <p className="text-xs text-muted-foreground line-clamp-1">{level.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {prog?.completed && prog?.test_score !== null && (
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                            {prog.test_score}%
                          </Badge>
                        )}
                        {unlocked && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {unlocked && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all bg-primary/60"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-7 text-right">{percent}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {levels.length === 0 && (
              <Card className="shadow-card">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Zatím nejsou k dispozici žádné levely v této sekci.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
