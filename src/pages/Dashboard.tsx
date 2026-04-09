import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Star, BookOpen, Lock, CheckCircle, ArrowRight, RotateCcw } from 'lucide-react';
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

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [levels, setLevels] = useState<Level[]>([]);
  const [progress, setProgress] = useState<UserProgressRow[]>([]);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      const [levelsRes, progressRes, reviewRes] = await Promise.all([
        supabase.from('levels').select('*').order('order_index'),
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('review_items').select('id', { count: 'exact' }).eq('user_id', user.id).in('confidence', ['partial', 'unknown']),
      ]);
      if (levelsRes.data) setLevels(levelsRes.data);
      if (progressRes.data) setProgress(progressRes.data);
      setReviewCount(reviewRes.count || 0);
    };
    fetchData();
  }, [user]);

  const isLevelUnlocked = (level: Level) => {
    if (level.order_index === 1) return true;
    const prevLevel = levels.find(l => l.order_index === level.order_index - 1);
    if (!prevLevel) return true;
    return progress.some(p => p.level_id === prevLevel.id && p.completed);
  };

  const getLevelProgress = (levelId: string) => {
    return progress.find(p => p.level_id === levelId);
  };

  const completedLevels = progress.filter(p => p.completed).length;
  const progressPercent = levels.length > 0 ? (completedLevels / levels.length) * 100 : 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Body</p>
                <p className="text-lg font-bold">{profile?.total_points || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                <Star className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Level</p>
                <p className="text-lg font-bold">{profile?.current_level || 1}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dokončeno</p>
                <p className="text-lg font-bold">{completedLevels}/{levels.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <Link to="/review" className="flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">K procvičení</p>
                  <p className="text-lg font-bold">{reviewCount}</p>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Overall progress */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Celkový postup</span>
              <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>

        {/* Levels */}
        <div>
          <h2 className="text-xl font-bold mb-4">Levely</h2>
          <div className="space-y-3">
            {levels.map((level) => {
              const unlocked = isLevelUnlocked(level);
              const prog = getLevelProgress(level.id);
              return (
                <Card key={level.id} className={`shadow-card transition-all ${!unlocked ? 'opacity-60' : 'hover:shadow-elevated cursor-pointer'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${prog?.completed ? 'bg-success/20' : unlocked ? 'gradient-primary' : 'bg-muted'}`}>
                          {prog?.completed ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : unlocked ? (
                            <span className="text-primary-foreground font-bold">{level.order_index}</span>
                          ) : (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
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
                          <Link to={`/level/${level.id}`}>
                            <Button size="sm" variant={prog?.completed ? 'outline' : 'default'} className={!prog?.completed ? 'gradient-primary text-primary-foreground' : ''}>
                              {prog?.completed ? 'Opakovat' : 'Začít'} <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
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
      </div>
    </AppLayout>
  );
}
