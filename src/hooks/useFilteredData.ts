/**
 * Hook for memoized data filtering in admin components
 * Prevents unnecessary re-filtering when props haven't changed
 */

'use client'

import { useMemo, useCallback } from 'react'

/**
 * Filter configuration for common patterns
 */
export interface FilterConfig<T> {
  searchTerm?: string
  filters?: Record<string, unknown>
  sort?: {
    field: keyof T
    direction: 'asc' | 'desc'
  }
}

/**
 * Hook for memoized filtering and sorting
 * Use this to avoid re-filtering large datasets on every render
 */
export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  config: FilterConfig<T>,
  filterFn?: (item: T, searchTerm?: string, filters?: Record<string, unknown>) => boolean,
): T[] {
  // Memoize the filtered and sorted data
  return useMemo(() => {
    let result = [...data]

    // Apply custom filter function
    if (filterFn && (config.searchTerm || config.filters)) {
      result = result.filter((item) => filterFn(item, config.searchTerm, config.filters))
    }

    // Apply sorting
    if (config.sort) {
      result.sort((a, b) => {
        const aVal = a[config.sort!.field]
        const bVal = b[config.sort!.field]

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const cmp = aVal.localeCompare(bVal)
          return config.sort!.direction === 'asc' ? cmp : -cmp
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return config.sort!.direction === 'asc' ? aVal - bVal : bVal - aVal
        }

        return 0
      })
    }

    return result
  }, [data, config.searchTerm, config.filters, config.sort, filterFn])
}

/**
 * Hook for text search filtering
 * Searches across multiple fields
 */
export function useTextSearch<T extends Record<string, any>>(
  data: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
): T[] {
  return useMemo(() => {
    if (!searchTerm) return data

    const lowerSearch = searchTerm.toLowerCase()
    return data.filter((item) =>
      searchFields.some((field) => {
        const value = item[field]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerSearch)
        }
        return String(value).toLowerCase().includes(lowerSearch)
      }),
    )
  }, [data, searchTerm, searchFields])
}

/**
 * Hook for filtering by status or enum fields
 */
export function useStatusFilter<T extends Record<string, any>>(
  data: T[],
  statusField: keyof T,
  statuses: unknown[],
): T[] {
  return useMemo(() => {
    if (statuses.length === 0) return data
    return data.filter((item) => statuses.includes(item[statusField]))
  }, [data, statusField, statuses])
}

/**
 * Hook for grouping data by a field
 */
export function useGroupBy<T extends Record<string, any>>(
  data: T[],
  groupField: keyof T,
): Map<unknown, T[]> {
  return useMemo(() => {
    const grouped = new Map<unknown, T[]>()

    data.forEach((item) => {
      const key = item[groupField]
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(item)
    })

    return grouped
  }, [data, groupField])
}

/**
 * Hook for paginating data
 */
export function usePagination<T>(
  data: T[],
  pageSize: number,
  currentPage: number = 1,
): {
  paginatedData: T[]
  totalPages: number
  totalItems: number
} {
  return useMemo(() => {
    const totalItems = data.length
    const totalPages = Math.ceil(totalItems / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize

    return {
      paginatedData: data.slice(startIndex, endIndex),
      totalPages,
      totalItems,
    }
  }, [data, pageSize, currentPage])
}
