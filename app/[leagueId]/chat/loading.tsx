import { Loader2 } from 'lucide-react'

export default function ChatLoading() {
  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`flex gap-2 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
          >
            <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
            <div className={`flex flex-col ${i % 2 === 0 ? 'items-start' : 'items-end'}`}>
              <div className="h-3 w-24 bg-muted animate-pulse rounded mb-1" />
              <div className="h-12 w-48 bg-muted animate-pulse rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="flex items-center gap-2 p-4 border-t">
        <div className="flex-1 h-11 bg-muted animate-pulse rounded-xl" />
        <div className="h-11 w-11 bg-muted animate-pulse rounded-full" />
      </div>

      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  )
}
