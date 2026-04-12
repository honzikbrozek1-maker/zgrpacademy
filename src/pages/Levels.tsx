import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useAppPath } from '@/lib/pathContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { getAvailableModulesFromQuestionTypes, getLevelProgressPercent } from '@/lib/levelProgress';

interface Level {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  passing_score: number;
}

interface UserProgressRow {
  level_id: string;
  completed: boolean;
  test_score: number | null;
  completed_modules: string[];
}

export default function Levels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { category, basePath } = useAppPath();
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState<UserProgressRow[]>([]);
  const [levelQuestionTypes, setLevelQuestionTypes] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const levelsRes = await supabase.from('levels').select('*').eq('category', category).order('order_index');
      if (levelsRes.data) setLevels(levelsRes.data);

      if (!levelsRes.data || levelsRes.data.length === 0) {
        setProgress([]);
        setLevelQuestionTypes({});
        return;
      }

      const levelIds = levelsRes.data.map((level) => level.id);
      const [progressRes, questionsRes] = await Promise.all([
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('questions_safe').select('level_id, type').in('level_id', levelIds),
      ]);

      if (progressRes.data) {
        const levelIdSet = new Set(levelIds);
        setProgress(progressRes.data
          .filter((item) => levelIdSet.has(item.level_id))
          .map((item) => ({
            ...item,
            completed_modules: Array.isArray(item.completed_modules) ? item.completed_modules as string[] : [],
          })));
      } else {
        setProgress([]);
      }

      const questionTypesMap = Object.fromEntries(levelIds.map((id) => [id, [] as string[]]));
      if (questionsRes.data) {
        for (const question of questionsRes.data) {
          questionTypesMap[question.level_id]?.push(question.type);
        }
      }
      setLevelQuestionTypes(questionTypesMap);
    };
    fetchData();
  }, [user, category]);

  // Next level unlocked only when previous level's test is passed
  const isLevelUnlocked = (level: Level) => {
    if (level.order_index === 1) return true;
    const prevLevel = levels.find(l => l.order_index === level.order_index - 1);
    if (!prevLevel) return true;
    return progress.some(p => p.level_id === prevLevel.id && p.completed && p.test_score !== null);
  };

  const getLevelProgress = (levelId: string) => progress.find(p => p.level_id === levelId);

  const getProgressPercent = (levelId: string, prog: UserProgressRow | undefined) => getLevelProgressPercent(
    getAvailableModulesFromQuestionTypes(levelQuestionTypes[levelId]),
    prog?.completed_modules,
    Boolean(prog?.completed && prog?.test_score !== null),
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold">Levely</h1>
        <div className="space-y-3">
          {levels.map((level) => {
            const unlocked = isLevelUnlocked(level);
            const prog = getLevelProgress(level.id);
            const percent = getProgressPercent(level.id, prog);
            return (
              <Card
                key={level.id}
                className={`shadow-card transition-all ${!unlocked ? 'opacity-60' : 'hover:shadow-elevated cursor-pointer'}`}
                onClick={() => unlocked && navigate(`${basePath}/level/${level.order_index}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          prog?.completed && prog.test_score ? 'bg-success/20' 
                          : unlocked ? 'bg-primary/15' 
                          : 'bg-muted'
                        }`}>
                          {prog?.completed && prog.test_score ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : unlocked ? (
                            <span className="font-bold text-primary">{level.order_index}</span>
                          ) : (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{level.title}</h3>
                        {level.description && <p className="text-sm text-muted-foreground">{level.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {prog?.test_score && (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          {prog.test_score}%
                        </Badge>
                      )}
                      {unlocked && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {unlocked && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-primary/60"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{percent}%</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {levels.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                Zatím nejsou k dispozici žádné levely.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
