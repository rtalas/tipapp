import { useState } from 'react'

/**
 * Hook for managing expandable table rows
 * Tracks which rows are expanded by ID
 * Reusable across matches, series, and special-bets pages
 */
export function useExpandableRow() {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  const toggleRow = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isExpanded = (id: number) => expandedIds.has(id)

  const collapseAll = () => setExpandedIds(new Set())

  return { expandedIds, toggleRow, isExpanded, collapseAll }
}
