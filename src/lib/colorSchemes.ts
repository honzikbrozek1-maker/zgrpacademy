export interface ColorScheme {
  id: string;
  name: string;
  emoji: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

export const colorSchemes: ColorScheme[] = [
  {
    id: 'teal',
    name: 'Tyrkysová',
    emoji: '🌊',
    light: {
      '--primary': '168 65% 38%',
      '--ring': '168 65% 38%',
      '--sidebar-primary': '168 65% 38%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '168 30% 95%',
      '--sidebar-accent-foreground': '168 65% 25%',
      '--sidebar-ring': '168 65% 38%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(168, 65%, 38%), hsl(180, 55%, 45%))',
    },
    dark: {
      '--primary': '168 60% 45%',
      '--ring': '168 60% 45%',
      '--sidebar-primary': '168 60% 45%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '222 20% 16%',
      '--sidebar-accent-foreground': '168 55% 55%',
      '--sidebar-ring': '168 60% 45%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(168, 60%, 45%), hsl(180, 50%, 50%))',
    },
  },
  {
    id: 'purple',
    name: 'Fialová',
    emoji: '🔮',
    light: {
      '--primary': '262 60% 50%',
      '--ring': '262 60% 50%',
      '--sidebar-primary': '262 60% 50%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '262 30% 95%',
      '--sidebar-accent-foreground': '262 60% 30%',
      '--sidebar-ring': '262 60% 50%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(262, 60%, 50%), hsl(280, 55%, 55%))',
    },
    dark: {
      '--primary': '262 55% 55%',
      '--ring': '262 55% 55%',
      '--sidebar-primary': '262 55% 55%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '262 20% 18%',
      '--sidebar-accent-foreground': '262 50% 65%',
      '--sidebar-ring': '262 55% 55%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(262, 55%, 55%), hsl(280, 50%, 60%))',
    },
  },
  {
    id: 'blue',
    name: 'Modrá',
    emoji: '💎',
    light: {
      '--primary': '217 70% 50%',
      '--ring': '217 70% 50%',
      '--sidebar-primary': '217 70% 50%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '217 30% 95%',
      '--sidebar-accent-foreground': '217 70% 30%',
      '--sidebar-ring': '217 70% 50%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(217, 70%, 50%), hsl(230, 60%, 55%))',
    },
    dark: {
      '--primary': '217 65% 55%',
      '--ring': '217 65% 55%',
      '--sidebar-primary': '217 65% 55%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '217 20% 18%',
      '--sidebar-accent-foreground': '217 55% 65%',
      '--sidebar-ring': '217 65% 55%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(217, 65%, 55%), hsl(230, 55%, 60%))',
    },
  },
  {
    id: 'rose',
    name: 'Růžová',
    emoji: '🌸',
    light: {
      '--primary': '340 65% 50%',
      '--ring': '340 65% 50%',
      '--sidebar-primary': '340 65% 50%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '340 30% 95%',
      '--sidebar-accent-foreground': '340 65% 30%',
      '--sidebar-ring': '340 65% 50%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(340, 65%, 50%), hsl(355, 60%, 55%))',
    },
    dark: {
      '--primary': '340 60% 55%',
      '--ring': '340 60% 55%',
      '--sidebar-primary': '340 60% 55%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '340 20% 18%',
      '--sidebar-accent-foreground': '340 50% 65%',
      '--sidebar-ring': '340 60% 55%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(340, 60%, 55%), hsl(355, 55%, 60%))',
    },
  },
  {
    id: 'green',
    name: 'Zelená',
    emoji: '🌿',
    light: {
      '--primary': '142 55% 40%',
      '--ring': '142 55% 40%',
      '--sidebar-primary': '142 55% 40%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '142 30% 95%',
      '--sidebar-accent-foreground': '142 55% 25%',
      '--sidebar-ring': '142 55% 40%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(142, 55%, 40%), hsl(155, 50%, 45%))',
    },
    dark: {
      '--primary': '142 50% 45%',
      '--ring': '142 50% 45%',
      '--sidebar-primary': '142 50% 45%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '142 20% 16%',
      '--sidebar-accent-foreground': '142 45% 55%',
      '--sidebar-ring': '142 50% 45%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(142, 50%, 45%), hsl(155, 45%, 50%))',
    },
  },
  {
    id: 'orange',
    name: 'Oranžová',
    emoji: '🔥',
    light: {
      '--primary': '25 90% 48%',
      '--ring': '25 90% 48%',
      '--sidebar-primary': '25 90% 48%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '25 40% 95%',
      '--sidebar-accent-foreground': '25 90% 28%',
      '--sidebar-ring': '25 90% 48%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(25, 90%, 48%), hsl(35, 85%, 52%))',
    },
    dark: {
      '--primary': '25 85% 52%',
      '--ring': '25 85% 52%',
      '--sidebar-primary': '25 85% 52%',
      '--sidebar-primary-foreground': '0 0% 100%',
      '--sidebar-accent': '25 20% 18%',
      '--sidebar-accent-foreground': '25 75% 60%',
      '--sidebar-ring': '25 85% 52%',
      '--gradient-primary': 'linear-gradient(135deg, hsl(25, 85%, 52%), hsl(35, 80%, 56%))',
    },
  },
];

export function applyColorScheme(schemeId: string, theme: 'light' | 'dark') {
  const scheme = colorSchemes.find(s => s.id === schemeId) || colorSchemes[0];
  const vars = theme === 'dark' ? scheme.dark : scheme.light;
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
