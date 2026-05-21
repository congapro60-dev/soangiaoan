import type { DeweyTheme } from './types';

interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  bgPaper: string;
  textMain: string;
  success: string;
  warning: string;
  timerBg: string;
  fontFamily: string;
}

const PALETTES: Record<DeweyTheme, ThemePalette> = {
  classic: {
    // Xanh navy + vàng — giống file index.html của user
    primary: '#0F4C81',
    secondary: '#F2A900',
    accent: '#E53E3E',
    bg: '#F8F9FA',
    bgPaper: '#FFFDF0',
    textMain: '#212529',
    success: '#28A745',
    warning: '#FFC107',
    timerBg: '#343A40',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },
  scifi: {
    // Đen + cyan — cho bài bối cảnh công nghệ/mật mã (Enigma)
    primary: '#0EA5E9',
    secondary: '#10B981',
    accent: '#F472B6',
    bg: '#0F172A',
    bgPaper: '#1E293B',
    textMain: '#E2E8F0',
    success: '#22C55E',
    warning: '#FBBF24',
    timerBg: '#020617',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  comic: {
    // Sáng + hồng — cho bài đời sống vui nhộn (chia kẹo)
    primary: '#EC4899',
    secondary: '#FBBF24',
    accent: '#8B5CF6',
    bg: '#FFF1F2',
    bgPaper: '#FEFCE8',
    textMain: '#1F2937',
    success: '#10B981',
    warning: '#F97316',
    timerBg: '#374151',
    fontFamily: "'Comic Sans MS', 'Quicksand', sans-serif",
  },
};

export function getThemeCss(theme: DeweyTheme): string {
  const p = PALETTES[theme];
  return `
    :root {
      --primary: ${p.primary};
      --secondary: ${p.secondary};
      --accent: ${p.accent};
      --bg: ${p.bg};
      --bg-paper: ${p.bgPaper};
      --text-main: ${p.textMain};
      --success: ${p.success};
      --warning: ${p.warning};
      --timer-bg: ${p.timerBg};
      --font-family: ${p.fontFamily};
    }
  `;
}

export const DEWEY_THEMES: DeweyTheme[] = ['classic', 'scifi', 'comic'];
