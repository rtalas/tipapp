'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function RootError({
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive opacity-50" />
      <h2 className="text-lg font-medium">{t('title')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      <Button className="mt-6" onClick={reset}>
        {t('tryAgain')}
      </Button>
    </div>
  );
}
