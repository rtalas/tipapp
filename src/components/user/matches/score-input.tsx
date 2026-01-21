'use client'

import * as React from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoreInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  min?: number
  max?: number
  label?: string
  className?: string
}

export function ScoreInput({
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 99,
  label,
  className,
}: ScoreInputProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1)
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className={cn(
            'score-button',
            (disabled || value <= min) && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Decrease score"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span
          className={cn(
            'score-display',
            disabled && 'opacity-50'
          )}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          className={cn(
            'score-button',
            (disabled || value >= max) && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Increase score"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
