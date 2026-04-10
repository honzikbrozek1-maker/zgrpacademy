import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, Star, BookOpen, RotateCcw, ArrowRight, Layers } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [levelCount, setLevelCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [levelsRes, progressRes, reviewRes] = await Promise.all([
        supabase.from('levels').select('id', { count: 'exact' }),
        supabase.from('user_progress').select('id', { count: 'exact' }).eq('user_id', user.id).eq('completed', true),
        supabase.from('review_items').select('id', { count: 'exact' }).eq('user_id', user.id).in('confidence', ['partial', 'unknown']),
      ]);
      setLevelCount(levelsRes.count || 0);
      setCompletedCount(progressRes.count || 0);
      setReviewCount(reviewRes.count || 0);
    };
    fetchData();
  }, [user]);

  const progressPercent = levelCount > 0 ? (completedCount / levelCount) * 100 : 0;

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up">
        <h1 className="text-2xl font-bold">Vítejte, {profile?.display_name || 'uživateli'}!</h1>

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
                <p className="text-lg font-bold">{completedCount}/{levelCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/levels">
            <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="h-6 w-6 text-primary" />
                  <div>
                    <h3 className="font-semibold">Pokračovat v učení</h3>
                    <p className="text-sm text-muted-foreground">Otevřít levely</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          {reviewCount > 0 && (
            <Link to="/review">
              <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <RotateCcw className="h-6 w-6 text-warning" />
                    <div>
                      <h3 className="font-semibold">Procvičování</h3>
                      <p className="text-sm text-muted-foreground">{reviewCount} položek k opakování</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
