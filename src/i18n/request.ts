import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { defaultLocale, locales } from './config';

export default getRequestConfig(async () => {
  // Get locale from request headers (set by middleware)
  const headersList = await headers();
  const locale = headersList.get('x-locale') || defaultLocale;

  // Validate locale
  const validLocale = locales.includes(locale as typeof locales[number])
    ? locale
    : defaultLocale;

  return {
    locale: validLocale,
    messages: (await import(`../../translations/${validLocale}.json`)).default,
  };
});
