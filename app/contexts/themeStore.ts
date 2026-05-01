import { create } from 'zustand';
import { Appearance } from 'react-native';

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const systemTheme = Appearance.getColorScheme();

export const useThemeStore = create<ThemeState>((set) => ({
  theme: systemTheme === 'dark' ? 'dark' : 'light', // Default to system theme
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setTheme: (theme) => set({ theme }),
}));
