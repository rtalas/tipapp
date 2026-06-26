'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

function isChunkLoadError(error: Error): boolean {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.toLowerCase().includes('load failed')
  );
}

export function ErrorBoundaryContent({
  error,
  reset,
  className,
  showDetails = false,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  className?: string;
  showDetails?: boolean;
}) {
  const t = useTranslations('common.errorBoundary');

  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleReset = () => {
    if (isChunkLoadError(error)) {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center text-center">
        <AlertTriangle className="mb-4 h-12 w-12 text-destructive opacity-50" />
        <h2 className="text-lg font-medium">{t('title')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
        {showDetails && error.message && (
          <details className="mt-4 w-full max-w-md text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              {t('errorDetails')}
            </summary>
            <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
              {error.message}
              {error.digest && `\n\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
        <Button className="mt-6" onClick={handleReset}>
          {t('tryAgain')}
        </Button>
      </div>
    </div>
  );
}
