export interface Language {
  code: string;
  label: string;
  flag: string;
  voice: string;
}

export const LANGUAGES: Language[] = [
  { code: 'vi', label: 'Vietnamese', flag: '🇻🇳', voice: 'vi-VN' },
  { code: 'en', label: 'English',    flag: '🇺🇸', voice: 'en-US' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳', voice: 'zh-CN' },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷', voice: 'ko-KR' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵', voice: 'ja-JP' },
  { code: 'fr', label: 'French',     flag: '🇫🇷', voice: 'fr-FR' },
  { code: 'de', label: 'German',     flag: '🇩🇪', voice: 'de-DE' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸', voice: 'es-ES' },
];

export const getLanguageByCode = (code: string): Language | undefined =>
  LANGUAGES.find((l) => l.code === code);
