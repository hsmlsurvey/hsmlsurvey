import { ThemeMode } from '@/context/ThemeContext';

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  success: string;
  warning: string;
  warningText: string;
  error: string;
  errorText: string;
  sidebar: string;
  sidebarBorder: string;
  sidebarText: string;
  sidebarMuted: string;
  hover: string;
  scrollbar: string;
  scrollbarTrack: string;
  inputBg: string;
  shadow: string;
}

export const lightPalette: Palette = {
  bg: '#f4f6fb',
  surface: '#ffffff',
  surfaceAlt: '#f0f3f9',
  border: '#d8dee9',
  text: '#1a2332',
  textMuted: '#5a6678',
  primary: '#0e7c66',
  primaryText: '#ffffff',
  primarySoft: '#d6f0e8',
  accent: '#0a6cff',
  success: '#1b9e5a',
  warning: '#c97a04',
  warningText: '#3a2a05',
  error: '#d64545',
  errorText: '#ffffff',
  sidebar: '#0f1b2d',
  sidebarBorder: '#22324a',
  sidebarText: '#e8eef7',
  sidebarMuted: '#9aa7bd',
  hover: '#1b2942',
  scrollbar: '#b9c2d0',
  scrollbarTrack: '#e7ebf1',
  inputBg: '#ffffff',
  shadow: 'rgba(15, 27, 45, 0.12)',
};

export const darkPalette: Palette = {
  bg: '#0a111f',
  surface: '#121b2e',
  surfaceAlt: '#0f1828',
  border: '#243049',
  text: '#e8eef7',
  textMuted: '#9aa7bd',
  primary: '#22c89e',
  primaryText: '#06231c',
  primarySoft: '#133a31',
  accent: '#4a9bff',
  success: '#34d399',
  warning: '#f0a93b',
  warningText: '#2a1d05',
  error: '#f56565',
  errorText: '#ffffff',
  sidebar: '#070d18',
  sidebarBorder: '#1a2640',
  sidebarText: '#e8eef7',
  sidebarMuted: '#7c8aa3',
  hover: '#162238',
  scrollbar: '#3a4663',
  scrollbarTrack: '#0f1828',
  inputBg: '#0f1828',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

export function paletteFor(mode: ThemeMode): Palette {
  return mode === 'dark' ? darkPalette : lightPalette;
}
