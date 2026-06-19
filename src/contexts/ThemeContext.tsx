import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'claro' | 'global-blue';

export interface ThemeOption {
  id: Theme;
  label: string;
  colors: {
    background: string;
    sidebar: string;
    card: string;
    text: string;
    primary: string;
  };
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'claro',
    label: 'PROFISSIONAL',
    colors: { background: '#F4F6F8', sidebar: '#182536', card: '#FFFFFF', text: '#1F2937', primary: '#155EEF' },
  },
  {
    id: 'global-blue',
    label: 'AZUL ATUAL',
    colors: { background: '#EBF0F7', sidebar: '#1E2D4D', card: '#F4F7FB', text: '#1B2840', primary: '#2059C8' },
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'claro', setTheme: () => {} });

const ALL_THEMES: Theme[] = ['claro', 'global-blue'];
const THEME_STORAGE_KEY = 'app-theme-v2';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return ALL_THEMES.includes(saved as Theme) ? (saved as Theme) : 'claro';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'dark-tech', 'dark-corporate', 'global-blue', 'premium-black', 'hacker-neon', 'midnight-blue', 'claro-quente', 'gold-dark');
    
    if (theme === 'global-blue') {
      root.classList.add('global-blue');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
