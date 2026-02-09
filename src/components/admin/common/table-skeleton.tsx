interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  // Vary widths across columns for a realistic look
  const widths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-24', 'w-20']

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {Array.from({ length: columns }, (_, i) => (
                <th key={i} className="h-10 px-4 text-left">
                  <div className={`h-3 ${widths[i % widths.length]} bg-muted animate-pulse rounded`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, rowIdx) => (
              <tr key={rowIdx} className="border-b last:border-0">
                {Array.from({ length: columns }, (_, colIdx) => (
                  <td key={colIdx} className="h-12 px-4">
                    <div className={`h-4 ${widths[colIdx % widths.length]} bg-muted animate-pulse rounded`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CardFormSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-6">
      {/* Title */}
      <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      {/* Form fields */}
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-full bg-muted animate-pulse rounded" />
        </div>
      ))}
      {/* Button */}
      <div className="h-10 w-32 bg-muted animate-pulse rounded" />
    </div>
  )
}

export function CardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {/* Search/filter area */}
      <div className="h-10 w-full bg-muted animate-pulse rounded" />
      {/* List items */}
      <div className="rounded-lg border divide-y">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
              <div className="space-y-1">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
