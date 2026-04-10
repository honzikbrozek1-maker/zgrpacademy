import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

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
}

export default function Levels() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState<UserProgressRow[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [levelsRes, progressRes] = await Promise.all([
        supabase.from('levels').select('*').order('order_index'),
        supabase.from('user_progress').select('*').eq('user_id', user.id),
      ]);
      if (levelsRes.data) setLevels(levelsRes.data);
      if (progressRes.data) setProgress(progressRes.data);
    };
    fetchData();
  }, [user]);

  const isLevelUnlocked = (level: Level) => {
    if (level.order_index === 1) return true;
    const prevLevel = levels.find(l => l.order_index === level.order_index - 1);
    if (!prevLevel) return true;
    return progress.some(p => p.level_id === prevLevel.id && p.completed);
  };

  const getLevelProgress = (levelId: string) => progress.find(p => p.level_id === levelId);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold">Levely</h1>
        <div className="space-y-3">
          {levels.map((level) => {
            const unlocked = isLevelUnlocked(level);
            const prog = getLevelProgress(level.id);
            return (
              <Card
                key={level.id}
                className={`shadow-card transition-all ${!unlocked ? 'opacity-60' : 'hover:shadow-elevated cursor-pointer'}`}
                onClick={() => unlocked && navigate(`/level/${level.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${prog?.completed ? 'bg-success/20' : unlocked ? 'bg-primary/15' : 'bg-muted'}`}>
                          {prog?.completed ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : unlocked ? (
                            <span className="text-primary font-bold">{level.order_index}</span>
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
                      {prog?.completed && (
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          {prog.test_score}%
                        </Badge>
                      )}
                      {unlocked && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  {unlocked && (
                    <div className="mt-3">
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${prog?.completed ? 100 : prog?.test_score ? Math.min(prog.test_score, 99) : 0}%` }}
                        />
                      </div>
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
