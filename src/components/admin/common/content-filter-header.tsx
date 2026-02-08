'use client'

/**
 * Generic filter header component for admin content pages
 * Provides consistent search, filter, and create button layout
 */

import * as React from 'react'
import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  name: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  placeholder?: string
  width?: string
}

export interface ContentFilterHeaderProps {
  /** Placeholder text for search input */
  searchPlaceholder: string
  /** Current search value */
  searchValue: string
  /** Callback when search value changes */
  onSearchChange: (value: string) => void
  /** Optional filter configurations */
  filters?: FilterConfig[]
  /** Text for create button */
  createButtonLabel: string
  /** Callback when create button is clicked */
  onCreateClick: () => void
  /** Optional: whether create button is disabled */
  createButtonDisabled?: boolean
}

/**
 * ContentFilterHeader component
 *
 * @example
 * ```tsx
 * <ContentFilterHeader
 *   searchPlaceholder="Search teams..."
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   filters={[
 *     {
 *       name: 'sport',
 *       value: sportFilter,
 *       onChange: setSportFilter,
 *       placeholder: 'Sport',
 *       options: [
 *         { value: 'all', label: 'All Sports' },
 *         { value: '1', label: 'Football' },
 *       ],
 *     },
 *   ]}
 *   createButtonLabel="Add Team"
 *   onCreateClick={() => createDialog.openDialog()}
 * />
 * ```
 */
export function ContentFilterHeader({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters = [],
  createButtonLabel,
  onCreateClick,
  createButtonDisabled = false,
}: ContentFilterHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Search Input */}
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm"
          aria-label={searchPlaceholder}
        />

        {/* Filter Selects */}
        {filters.map((filter) => (
          <Select
            key={filter.name}
            value={filter.value}
            onValueChange={filter.onChange}
          >
            <SelectTrigger
              className={filter.width || 'w-[180px]'}
              aria-label={filter.placeholder || `Filter by ${filter.name}`}
            >
              <SelectValue placeholder={filter.placeholder || filter.name} />
            </SelectTrigger>
            <SelectContent>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
      </div>

      {/* Create Button */}
      <Button
        onClick={onCreateClick}
        disabled={createButtonDisabled}
        aria-label={createButtonLabel}
      >
        <Plus className="mr-2 h-4 w-4" />
        {createButtonLabel}
      </Button>
    </div>
  )
}
