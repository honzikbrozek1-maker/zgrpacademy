import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, Star, BookOpen, RotateCcw, ArrowRight, Layers, Lock, CheckCircle, Info } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

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

  const completedCount = progress.filter(p => p.completed).length;
  const progressPercent = levels.length > 0 ? (completedCount / levels.length) * 100 : 0;

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
        <h1 className="text-2xl font-bold">Vítejte, {profile?.display_name || 'uživateli'}!</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card relative">
            <Dialog>
              <DialogTrigger asChild>
                <button className="absolute top-2 left-2 text-muted-foreground hover:text-primary transition-colors z-10">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" /> Bodový systém
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">Body získáváte za aktivitu v aplikaci. Slouží jako motivace a přehled vašeho pokroku.</p>
                  <div className="space-y-2">
                    <h4 className="font-semibold">Jak získat body:</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center p-2 rounded-lg bg-muted">
                        <span>✅ Správná odpověď v kvízu</span>
                        <Badge variant="secondary">+10 bodů</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-lg bg-muted">
                        <span>🏆 Úspěšný závěrečný test</span>
                        <Badge variant="secondary">+50 bodů</Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-xs">Čím více se učíte, tím více bodů získáte!</p>
                </div>
              </DialogContent>
            </Dialog>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Body</p>
                <p className="text-lg font-bold">{profile?.total_points || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Star className="h-5 w-5 text-accent" />
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
                <p className="text-lg font-bold">{completedCount}/{levels.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
                <RotateCcw className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">K procvičení</p>
                <p className="text-lg font-bold">{reviewCount}</p>
              </div>
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

        {/* Quick actions */}
        {reviewCount > 0 && (
          <Link to="/review">
            <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-warning" />
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

        {/* Levels list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> Levely
            </h2>
            <Link to="/levels">
              <Button variant="ghost" size="sm">Zobrazit vše <ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </div>
          <div className="space-y-2">
            {levels.map((level) => {
              const unlocked = isLevelUnlocked(level);
              const prog = getLevelProgress(level.id);
              return (
                <Card key={level.id} className={`shadow-card transition-all ${!unlocked ? 'opacity-60' : 'hover:shadow-elevated'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold ${prog?.completed ? 'bg-success/20' : unlocked ? 'bg-primary/15 text-primary' : 'bg-muted'}`}>
                          {prog?.completed ? <CheckCircle className="h-4 w-4 text-success" /> : unlocked ? level.order_index : <Lock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{level.title}</h3>
                          {level.description && <p className="text-xs text-muted-foreground line-clamp-1">{level.description}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {prog?.completed && (
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                            {prog.test_score}%
                          </Badge>
                        )}
                        {unlocked && (
                          <Link to={`/level/${level.id}`}>
                            <Button size="sm" variant="ghost"><ArrowRight className="h-4 w-4" /></Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
