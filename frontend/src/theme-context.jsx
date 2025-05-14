import { createContext, useContext, useEffect, useState } from 'react';

export const ThemeContext = createContext();

export const themes = {
  dark: {
    background: '#0d1117',
    card: '#161b22',
    text: '#c9d1d9',
    primary: '#58a6ff',
    secondary: '#30363d',
    success: '#2ea043',
    danger: '#f85149',
    border: '#21262d',
  },
  light: {
    background: '#f9f9f9',
    card: '#ffffff',
    text: '#1f2937',
    primary: '#3b82f6',
    secondary: '#e5e7eb',
    success: '#10b981',
    danger: '#ef4444',
    border: '#d1d5db',
  },
};

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark');

  const applyTheme = (theme) => {
    Object.entries(theme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
  };

  useEffect(() => {
    applyTheme(themes[mode]);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
    {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
