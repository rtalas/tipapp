'use client'

import { Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { PrizeTier } from '@/lib/validation/admin'

interface FineTierRowProps {
  fine: PrizeTier
  index: number
  onUpdate: (index: number, field: keyof PrizeTier, value: number | string) => void
  onRemove: (index: number) => void
  error?: string | null
}

export function FineTierRow({ fine, index, onUpdate, onRemove, error }: FineTierRowProps) {
  const t = useTranslations('admin.leagueActions.finesSection')

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
    <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        {/* Rank (from bottom) */}
        <div className="w-20 flex-shrink-0">
          <Label htmlFor={`fine-rank-${index}`} className="text-xs text-muted-foreground">
            {t('position')}
          </Label>
          <Input
            id={`fine-rank-${index}`}
            type="number"
            min={1}
            max={10}
            value={fine.rank}
            onChange={(e) => onUpdate(index, 'rank', parseInt(e.target.value) || 1)}
            className="mt-1"
          />
        </div>

        {/* Amount (in Kč) */}
        <div className="flex-1">
          <Label htmlFor={`fine-amount-${index}`} className="text-xs text-muted-foreground">
            {t('amount')}
          </Label>
          <Input
            id={`fine-amount-${index}`}
            type="text"
            value={formatAmount(fine.amount)}
            onChange={(e) => {
              const amount = parseAmount(e.target.value)
              onUpdate(index, 'amount', amount)
            }}
            className="mt-1 border-destructive/30"
            placeholder="100"
          />
        </div>

        {/* Label (optional) */}
        <div className="flex-1">
          <Label htmlFor={`fine-label-${index}`} className="text-xs text-muted-foreground">
            {t('label')}
          </Label>
          <Input
            id={`fine-label-${index}`}
            type="text"
            maxLength={100}
            value={fine.label || ''}
            onChange={(e) => onUpdate(index, 'label', e.target.value)}
            className="mt-1"
            placeholder={t('labelPlaceholder')}
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
            aria-label={t('removeTier', { index: index + 1 })}
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
