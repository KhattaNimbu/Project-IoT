import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme: Theme = storedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setIsLoading(false);

    // Listen for global theme updates to keep multiple hooks synced
    const handleThemeChange = (e: any) => setTheme(e.detail);
    window.addEventListener('theme-synced', handleThemeChange);
    return () => window.removeEventListener('theme-synced', handleThemeChange);
  }, []);

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;
    if (newTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    applyTheme(newTheme);
    // Broadcast the new theme so other components (like Index graphs) immediately update
    window.dispatchEvent(new CustomEvent('theme-synced', { detail: newTheme }));
  };

  return { theme, toggleTheme, isLoading };
}
