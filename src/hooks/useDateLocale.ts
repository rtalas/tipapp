'use client'

import { useLocale } from 'next-intl'
import { cs, enUS } from 'date-fns/locale'
import type { Locale } from 'date-fns'

const localeMap: Record<string, Locale> = {
  cs,
  en: enUS,
}

/**
 * Returns the date-fns locale based on the current next-intl locale
 */
export function useDateLocale() {
  const locale = useLocale()

  return localeMap[locale] ?? enUS
}
