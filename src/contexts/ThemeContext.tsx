import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'claro' | 'dark-tech' | 'dark-corporate' | 'global-blue' | 'premium-black' | 'hacker-neon' | 'midnight-blue' | 'claro-quente' | 'gold-dark';

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
    label: 'AZUL CORPORATIVO',
    colors: { background: '#EBF0F7', sidebar: '#1E2D4D', card: '#F4F7FB', text: '#1B2840', primary: '#2059C8' },
  },
  {
    id: 'global-blue',
    label: 'CLARO ALTERNATIVO',
    colors: { background: '#F1F5F9', sidebar: '#FFFFFF', card: '#FFFFFF', text: '#0F172A', primary: '#16A34A' },
  },
  {
    id: 'dark-tech',
    label: 'DARK TECH',
    colors: { background: '#0F172A', sidebar: '#1E293B', card: '#1E293B', text: '#F1F5F9', primary: '#3B82F6' },
  },
  {
    id: 'dark-corporate',
    label: 'DARK CORPORATE',
    colors: { background: '#121212', sidebar: '#1F1F1F', card: '#2A2A2A', text: '#FFFFFF', primary: '#F59E0B' },
  },
  {
    id: 'premium-black',
    label: 'PREMIUM BLACK',
    colors: { background: '#0A0A0A', sidebar: '#141414', card: '#1C1C1C', text: '#FFFFFF', primary: '#2563EB' },
  },
  {
    id: 'hacker-neon',
    label: 'HACKER NEON',
    colors: { background: '#0A1A0F', sidebar: '#0F2416', card: '#142E1C', text: '#00FF66', primary: '#00FF66' },
  },
  {
    id: 'midnight-blue',
    label: 'MIDNIGHT BLUE',
    colors: { background: '#0B1224', sidebar: '#111D38', card: '#162545', text: '#C5D4E8', primary: '#3B8BFF' },
  },
  {
    id: 'claro-quente',
    label: 'CLARO QUENTE',
    colors: { background: '#FDF8F3', sidebar: '#4A3728', card: '#FFFFFF', text: '#3D2B1F', primary: '#D97706' },
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: 'claro', setTheme: () => {} });

const ALL_THEMES: Theme[] = ['claro', 'dark-tech', 'dark-corporate', 'global-blue', 'premium-black', 'hacker-neon', 'midnight-blue', 'claro-quente'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme');
    return ALL_THEMES.includes(saved as Theme) ? (saved as Theme) : 'claro';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'dark-tech', 'dark-corporate', 'global-blue', 'premium-black', 'hacker-neon', 'midnight-blue', 'claro-quente');
    
    if (theme === 'global-blue') {
      root.classList.add('global-blue');
    } else if (theme === 'claro-quente') {
      root.classList.add('claro-quente');
    } else if (theme !== 'claro') {
      root.classList.add('dark', theme);
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
