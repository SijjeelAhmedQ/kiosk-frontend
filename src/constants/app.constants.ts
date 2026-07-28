export const APP = {
  name: 'EMBER',
  tagline: 'Flame-grilled · Made to order',
  taxRate: 0.0825,               // 8.25%
  currency: (import.meta.env.VITE_CURRENCY as string) ?? 'PKR',
  locale: 'en-PK',
  idleTimeoutMs: Number(import.meta.env.VITE_IDLE_TIMEOUT_MS ?? 90000),
} as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'es', label: 'Spanish', native: 'Español' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
