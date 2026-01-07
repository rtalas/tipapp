import { useState, useMemo, useCallback } from 'react'

/**
 * Hook for managing search and filter state
 * Reduces component state variables and provides consistent filtering logic
 */
export function useContentFilter<T>(
  items: T[],
  filterFn: (item: T, search: string, filters: Record<string, unknown>) => boolean,
) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, unknown>>({})

  const filtered = useMemo(
    () => items.filter((item) => filterFn(item, search, filters)),
    [items, search, filters, filterFn],
  )

  const updateFilter = useCallback((key: string, value: unknown) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setSearch('')
    setFilters({})
  }, [])

  return {
    search,
    setSearch,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    filtered,
  }
}
