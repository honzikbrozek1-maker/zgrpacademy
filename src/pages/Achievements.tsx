import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle, Crown, Gem, Medal, Rocket, Sparkles, Star, Target, Trophy } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { POINT_ACHIEVEMENTS, type AchievementIcon, type AchievementTone, getUnlockedAchievements } from '@/lib/achievements';

const iconMap = {
  star: Star,
  trophy: Trophy,
  award: Award,
  gem: Gem,
  sparkles: Sparkles,
  medal: Medal,
  crown: Crown,
  target: Target,
  rocket: Rocket,
} satisfies Record<AchievementIcon, typeof Trophy>;

const toneClasses: Record<AchievementTone, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent text-accent-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

export default function Achievements() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const totalPoints = profile?.total_points || 0;
  const unlockedAchievements = getUnlockedAchievements(totalPoints);

  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-slide-up pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Achievementy</h1>
            <p className="text-sm text-muted-foreground">Přehled všech bodových milníků a odemčených odměn.</p>
          </div>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Aktuální body</p>
              <p className="text-3xl font-bold">{totalPoints}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Odemčeno</p>
              <p className="text-xl font-semibold">{unlockedAchievements.length} / {POINT_ACHIEVEMENTS.length}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {POINT_ACHIEVEMENTS.map((achievement) => {
            const unlocked = totalPoints >= achievement.threshold;
            const Icon = iconMap[achievement.icon];

            return (
              <Card key={achievement.threshold} className={`shadow-card transition-all ${unlocked ? 'border-primary/20' : 'opacity-75'}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${toneClasses[achievement.tone]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold">{achievement.title}</h2>
                      <span className="text-xs text-muted-foreground">{achievement.threshold} bodů</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  {unlocked ? <CheckCircle className="h-5 w-5 text-success shrink-0" /> : <span className="text-xs text-muted-foreground shrink-0">Zamčeno</span>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}