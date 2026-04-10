import { useEffect } from 'react';
import { Trophy, Star, Award, Gem, Crown, Medal, Sparkles, Target, Rocket } from 'lucide-react';
import { getAchievementByThreshold } from '@/lib/achievements';

interface Props {
  open: boolean;
  milestone: number;
  onClose: () => void;
}

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
};

const toneClasses = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent text-accent-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

export default function MilestoneDialog({ open, milestone, onClose }: Props) {
  const achievement = getAchievementByThreshold(milestone) || getAchievementByThreshold(100);
  const Icon = achievement ? iconMap[achievement.icon] : Trophy;
  const toneClass = achievement ? toneClasses[achievement.tone] : toneClasses.primary;

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up max-w-xs">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border shadow-elevated cursor-pointer"
        onClick={onClose}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{achievement?.title || 'Nový achievement'}</p>
          <p className="text-xs text-muted-foreground">
            {milestone} bodů · {achievement?.description || 'Další milník je splněn.'}
          </p>
        </div>
      </div>
    </div>
  );
}
