export const APP = {
  name: 'Friends Kitchen',
  tagline: 'Flame-grilled · Made to order',
  /* The basket's estimate while the order is being built. The server prices the
     order for real from AppSettings.TaxRate — keep the two in step, or the
     customer is shown one total and charged another. */
  taxRate: 0.15,                 // 15%
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
