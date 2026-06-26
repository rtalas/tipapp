'use client';

import { ErrorBoundaryContent } from '@/components/error-boundary-content';

export default function ChatError({
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
      className="mx-auto max-w-2xl px-4 py-12"
    />
  );
}
