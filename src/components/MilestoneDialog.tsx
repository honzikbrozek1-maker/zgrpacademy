import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm text-center">
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/30 dark:to-amber-800/30 flex items-center justify-center animate-pulse-success">
            <Icon className={`h-10 w-10 ${config.color}`} />
          </div>
          <h2 className="text-xl font-bold">{config.title}</h2>
          <p className="text-muted-foreground">
            Dosáhli jste <span className="font-bold text-foreground">{milestone}</span> bodů! Skvělá práce!
          </p>
          <Button onClick={onClose} className="gradient-primary text-primary-foreground">
            Pokračovat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
