'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { locales, cookieName, type Locale } from '@/i18n/config';
import { AppError } from '@/lib/error-handler';

export async function setLocale(locale: Locale) {
  // Validate locale
  if (!locales.includes(locale)) {
    throw new AppError(`Unsupported locale: ${locale}`, 'BAD_REQUEST', 400);
  }

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(cookieName, locale, {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // Revalidate all pages to apply new locale
  revalidatePath('/', 'layout');
}
