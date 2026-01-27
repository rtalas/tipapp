'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { locales, localeLabels, type Locale } from '@/i18n/config';
import { setLocale } from '@/actions/user/locale';

interface LanguageSwitcherProps {
  currentLocale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LanguageSwitcher({ currentLocale, open, onOpenChange }: LanguageSwitcherProps) {
  const t = useTranslations('user.language');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLanguageChange = async (locale: Locale) => {
    if (locale === currentLocale) {
      onOpenChange(false);
      return;
    }

    try {
      startTransition(async () => {
        await setLocale(locale);
        onOpenChange(false);
        toast.success(
          locale === 'en' ? t('changedToEnglish') : t('changedToCzech')
        );
        router.refresh();
      });
    } catch (error) {
      console.error('Failed to change language:', error);
      toast.error(t('changeFailed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{t('chooseLanguage')}</DialogTitle>
          <DialogDescription>
            {t('selectPreferredLanguage')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {locales.map((locale) => (
            <button
              key={locale}
              onClick={() => handleLanguageChange(locale)}
              disabled={isPending}
              className={`flex w-full items-center gap-3 p-3 rounded-lg border transition-colors ${
                locale === currentLocale
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent'
              } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-2xl">
                {locale === 'en' ? '🇬🇧' : '🇨🇿'}
              </span>
              <span className="flex-1 text-left font-medium">
                {localeLabels[locale]}
              </span>
              {locale === currentLocale && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
