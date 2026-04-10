export type AchievementTone = 'primary' | 'accent' | 'success' | 'warning';
export type AchievementIcon = 'star' | 'trophy' | 'award' | 'gem' | 'sparkles' | 'medal' | 'crown' | 'target' | 'rocket';

export interface PointAchievement {
  threshold: number;
  title: string;
  description: string;
  tone: AchievementTone;
  icon: AchievementIcon;
}

export const POINT_ACHIEVEMENTS: PointAchievement[] = [
  { threshold: 50, title: 'Dobrý začátek', description: 'Prvních 50 bodů je doma.', tone: 'warning', icon: 'star' },
  { threshold: 100, title: 'Stovka na kontě', description: 'Držíte stabilní tempo.', tone: 'warning', icon: 'trophy' },
  { threshold: 200, title: 'Výborný pokrok', description: 'Dvě stovky bodů potvrzují pravidelnost.', tone: 'primary', icon: 'award' },
  { threshold: 350, title: 'Ve formě', description: 'Jde vidět, že se k učení vracíte často.', tone: 'accent', icon: 'sparkles' },
  { threshold: 500, title: 'Půl tisíce', description: 'Silný milník v průběžném studiu.', tone: 'success', icon: 'gem' },
  { threshold: 750, title: 'Tah na branku', description: 'Motivace i výkon drží pohromadě.', tone: 'primary', icon: 'target' },
  { threshold: 1000, title: 'Tisíc bodů', description: 'Skvělý výkon a velká dávka disciplíny.', tone: 'warning', icon: 'crown' },
  { threshold: 1500, title: 'Mistr tempa', description: 'Máte za sebou opravdu poctivý kus práce.', tone: 'accent', icon: 'medal' },
  { threshold: 2000, title: 'Akademická legenda', description: 'Patříte mezi nejvytrvalejší studující.', tone: 'success', icon: 'rocket' },
];

export function checkMilestone(oldPoints: number, newPoints: number): number | null {
  for (const achievement of POINT_ACHIEVEMENTS) {
    if (oldPoints < achievement.threshold && newPoints >= achievement.threshold) {
      return achievement.threshold;
    }
  }

  return null;
}

export function getAchievementByThreshold(threshold: number): PointAchievement | undefined {
  return POINT_ACHIEVEMENTS.find((achievement) => achievement.threshold === threshold);
}

export function getUnlockedAchievements(points: number): PointAchievement[] {
  return POINT_ACHIEVEMENTS.filter((achievement) => points >= achievement.threshold);
}