'use client'

import { Loader2 } from 'lucide-react'

export function PageLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/50 z-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
