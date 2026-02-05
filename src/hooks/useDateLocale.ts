'use client'

import { useLocale } from 'next-intl'
import { cs, enUS } from 'date-fns/locale'

/**
 * Returns the date-fns locale based on the current next-intl locale
 */
export function useDateLocale() {
  const locale = useLocale()

  return locale === 'cs' ? cs : enUS
}
