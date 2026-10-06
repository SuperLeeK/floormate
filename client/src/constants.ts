import { CharacterType } from './types';

export interface CharacterTheme {
  type: CharacterType;
  label: string;
  themeColor: string; // 캐릭터 대표 테마 색상
  limbColor: string;  // 손/발 색상
  outlineColor?: string; // 손/발 테두리 색상
}

export const CHARACTER_THEMES: Record<CharacterType, CharacterTheme> = {
  cat: {
    type: 'cat',
    label: '고양이',
    themeColor: '#7a8288',
    limbColor: '#e2e6ea',
    outlineColor: '#3a3a3a',
  },
  coffee: {
    type: 'coffee',
    label: '커피',
    themeColor: '#8a532d',
    limbColor: '#f7d6a5',
    outlineColor: '#3a3a3a',
  },
  dog: {
    type: 'dog',
    label: '강아지',
    themeColor: '#c68449',
    limbColor: '#fff1de',
    outlineColor: '#3a3a3a',
  },
  egg: {
    type: 'egg',
    label: '계란후라이',
    themeColor: '#ff9800',
    limbColor: '#ffffff',
    outlineColor: '#3a3a3a',
  },
  frog: {
    type: 'frog',
    label: '개구리',
    themeColor: '#4caf50',
    limbColor: '#c8e6c9',
    outlineColor: '#3a3a3a',
  },
  hamburger: {
    type: 'hamburger',
    label: '햄버거',
    themeColor: '#d38135',
    limbColor: '#ffe5b4',
    outlineColor: '#3a3a3a',
  },
  makarong: {
    type: 'makarong',
    label: '마카롱',
    themeColor: '#e91e63',
    limbColor: '#f8bbd0',
    outlineColor: '#3a3a3a',
  },
  octopus: {
    type: 'octopus',
    label: '문어',
    themeColor: '#e53935',
    limbColor: '#ffcdd2',
    outlineColor: '#3a3a3a',
  },
  ramen: {
    type: 'ramen',
    label: '라면',
    themeColor: '#ff5722',
    limbColor: '#ffe082',
    outlineColor: '#3a3a3a',
  },
};

export const CHARACTER_LIST: CharacterTheme[] = Object.values(CHARACTER_THEMES);

export const CHARACTERS: { type: CharacterType; label: string }[] = CHARACTER_LIST.map((c) => ({
  type: c.type,
  label: c.label,
}));

export const DEFAULT_CHARACTER: CharacterType = 'cat';

export const DEFAULT_SHORTCUTS = {
  chatInput: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac')
    ? 'Control+Alt+Command+P'
    : 'Control+Alt+Shift+P',
  chatHistory: '',
  settings: '',
};
