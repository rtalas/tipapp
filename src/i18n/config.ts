export const locales = ['en', 'cs'] as const;
export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  cs: 'Čeština',
};

export const cookieName = 'NEXT_LOCALE';
