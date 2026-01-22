'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PrizeTier } from '@/lib/validation/admin'

interface PrizeTierRowProps {
  prize: PrizeTier
  index: number
  onUpdate: (index: number, field: keyof PrizeTier, value: number | string) => void
  onRemove: (index: number) => void
  error?: string | null
}

export function PrizeTierRow({ prize, index, onUpdate, onRemove, error }: PrizeTierRowProps) {
  // Format amount with thousands separator for display
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      minimumFractionDigits: 0,
    }).format(value / 100)
  }

  // Parse formatted amount back to integer (minor units)
  const parseAmount = (formatted: string) => {
    const cleaned = formatted.replace(/\s/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : Math.round(parsed * 100)
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        {/* Rank */}
        <div className="w-20 flex-shrink-0">
          <Label htmlFor={`prize-rank-${index}`} className="text-xs text-muted-foreground">
            Position
          </Label>
          <Input
            id={`prize-rank-${index}`}
            type="number"
            min={1}
            max={10}
            value={prize.rank}
            onChange={(e) => onUpdate(index, 'rank', parseInt(e.target.value) || 1)}
            className="mt-1"
            aria-label={`Prize rank ${index + 1}`}
          />
        </div>

        {/* Amount (in Kč) */}
        <div className="flex-1">
          <Label htmlFor={`prize-amount-${index}`} className="text-xs text-muted-foreground">
            Amount (Kč)
          </Label>
          <Input
            id={`prize-amount-${index}`}
            type="text"
            value={formatAmount(prize.amount)}
            onChange={(e) => {
              const amount = parseAmount(e.target.value)
              onUpdate(index, 'amount', amount)
            }}
            className="mt-1"
            placeholder="1 000"
            aria-label={`Prize amount ${index + 1}`}
          />
        </div>

        {/* Label (optional) */}
        <div className="flex-1">
          <Label htmlFor={`prize-label-${index}`} className="text-xs text-muted-foreground">
            Label (optional)
          </Label>
          <Input
            id={`prize-label-${index}`}
            type="text"
            maxLength={100}
            value={prize.label || ''}
            onChange={(e) => onUpdate(index, 'label', e.target.value)}
            className="mt-1"
            placeholder="Champion"
            aria-label={`Prize label ${index + 1}`}
          />
        </div>

        {/* Delete button */}
        <div className="flex items-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(index)}
            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove prize tier ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
