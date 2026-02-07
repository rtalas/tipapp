'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function UserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common.errorBoundary');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive opacity-50" />
        <h2 className="text-lg font-medium">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
        <Button className="mt-6" onClick={reset}>
          {t('tryAgain')}
        </Button>
      </div>
    </div>
  );
}
