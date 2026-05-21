import type { DeweyTheme } from './types';

interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  bgPaper: string;
  bgCard: string;
  bgSurface: string;
  textMain: string;
  textMuted: string;
  border: string;
  success: string;
  info: string;
  warning: string;
  notebookLine: string;
  timerBg: string;
  timerLabel: string;
  timerValue: string;
  fontFamily: string;
  fontMono: string;
}

const PALETTES: Record<DeweyTheme, ThemePalette> = {
  classic: {
    // Xanh navy + vàng — giống file index.html của user
    primary: '#0F4C81',
    secondary: '#F2A900',
    accent: '#DC2626',
    bg: '#F8F9FA',
    bgPaper: '#FFFDF0',
    bgCard: '#FFFFFF',
    bgSurface: '#F8FAFC',
    textMain: '#212529',
    textMuted: '#64748B',
    border: '#E2E8F0',
    success: '#16A34A',
    info: '#0EA5E9',
    warning: '#FFC107',
    notebookLine: '#FCD34D',
    timerBg: '#1F2937',
    timerLabel: '#FFFFFF',
    timerValue: '#F2A900',
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
    fontMono: "'JetBrains Mono','Courier New',monospace",
  },
  scifi: {
    // Đen + cyan — cho bài bối cảnh công nghệ/mật mã (Enigma)
    primary: '#0EA5E9',
    secondary: '#10B981',
    accent: '#F472B6',
    bg: '#0F172A',
    bgPaper: '#1E293B',
    bgCard: '#111827',
    bgSurface: '#1E293B',
    textMain: '#E2E8F0',
    textMuted: '#94A3B8',
    border: '#334155',
    success: '#22C55E',
    info: '#38BDF8',
    warning: '#FBBF24',
    notebookLine: '#334155',
    timerBg: '#020617',
    timerLabel: '#E0F2FE',
    timerValue: '#67E8F9',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    fontMono: "'JetBrains Mono','Courier New',monospace",
  },
  comic: {
    // Sáng + hồng — cho bài đời sống vui nhộn (chia kẹo)
    primary: '#EC4899',
    secondary: '#FBBF24',
    accent: '#8B5CF6',
    bg: '#FFF1F2',
    bgPaper: '#FEFCE8',
    bgCard: '#FFFFFF',
    bgSurface: '#FFF7ED',
    textMain: '#1F2937',
    textMuted: '#6B7280',
    border: '#F9A8D4',
    success: '#10B981',
    info: '#06B6D4',
    warning: '#F97316',
    notebookLine: '#FDE68A',
    timerBg: '#374151',
    timerLabel: '#FFFFFF',
    timerValue: '#FBBF24',
    fontFamily: "'Comic Sans MS', 'Quicksand', sans-serif",
    fontMono: "'JetBrains Mono','Courier New',monospace",
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
      --bg-card: ${p.bgCard};
      --bg-surface: ${p.bgSurface};
      --text-main: ${p.textMain};
      --text-muted: ${p.textMuted};
      --border: ${p.border};
      --success: ${p.success};
      --info: ${p.info};
      --warning: ${p.warning};
      --notebook-line: ${p.notebookLine};
      --timer-bg: ${p.timerBg};
      --timer-label: ${p.timerLabel};
      --timer-value: ${p.timerValue};
      --font-family: ${p.fontFamily};
      --font-mono: ${p.fontMono};
    }
  `;
}

export const DEWEY_THEMES: DeweyTheme[] = ['classic', 'scifi', 'comic'];
