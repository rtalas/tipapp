'use client';

import { ErrorBoundaryContent } from '@/components/error-boundary-content';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundaryContent
      error={error}
      reset={reset}
      className="flex min-h-screen flex-col items-center justify-center px-4"
    />
  );
}
