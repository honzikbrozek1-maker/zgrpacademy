import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { applyColorScheme } from './colorSchemes';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void; colorScheme: string; setColorScheme: (id: string) => void }>({
  theme: 'light',
  toggleTheme: () => {},
  colorScheme: 'teal',
  setColorScheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'light';
    }
    return 'light';
  });

  const [colorScheme, setColorSchemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('colorScheme') || 'teal';
    }
    return 'teal';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    applyColorScheme(colorScheme, theme);
  }, [theme, colorScheme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const setColorScheme = (id: string) => {
    setColorSchemeState(id);
    localStorage.setItem('colorScheme', id);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
