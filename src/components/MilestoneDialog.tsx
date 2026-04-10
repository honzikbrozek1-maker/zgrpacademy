import { useEffect } from 'react';
import { Trophy, Star, Award, Gem, Crown } from 'lucide-react';

const MILESTONES = [50, 100, 200, 500, 1000];

interface Props {
  open: boolean;
  milestone: number;
  onClose: () => void;
}

const milestoneConfig: Record<number, { icon: typeof Trophy; color: string; title: string }> = {
  50: { icon: Star, color: 'text-yellow-500', title: 'Dobrý začátek!' },
  100: { icon: Trophy, color: 'text-amber-500', title: 'Stovka na kontě!' },
  200: { icon: Award, color: 'text-blue-500', title: 'Výborný pokrok!' },
  500: { icon: Gem, color: 'text-purple-500', title: 'Půl tisíce bodů!' },
  1000: { icon: Crown, color: 'text-yellow-400', title: 'Tisíc bodů! 👑' },
};

export function checkMilestone(oldPoints: number, newPoints: number): number | null {
  for (const m of MILESTONES) {
    if (oldPoints < m && newPoints >= m) return m;
  }
  return null;
}

export default function MilestoneDialog({ open, milestone, onClose }: Props) {
  const config = milestoneConfig[milestone] || milestoneConfig[100];
  const Icon = config.icon;

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
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/30 dark:to-amber-800/30 flex items-center justify-center shrink-0">
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{config.title}</p>
          <p className="text-xs text-muted-foreground">
            {milestone} bodů dosaženo! 🎉
          </p>
        </div>
      </div>
    </div>
  );
}
