'use client'

import { Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { PrizeTier } from '@/lib/validation/admin'

type TierVariant = 'prize' | 'fine'

interface TierRowProps {
  tier: PrizeTier
  variant: TierVariant
  index: number
  onUpdate: (index: number, field: keyof PrizeTier, value: number | string) => void
  onRemove: (index: number) => void
  error?: string | null
}

export function formatAmount(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
  }).format(value / 100)
}

export function parseAmount(formatted: string) {
  const cleaned = formatted.replace(/\s/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : Math.round(parsed * 100)
}

export function TierRow({ tier, variant, index, onUpdate, onRemove, error }: TierRowProps) {
  const t = useTranslations(`admin.leagueActions.${variant === 'prize' ? 'prizesSection' : 'finesSection'}`)
  const locale = useLocale()
  const prefix = variant

  return (
    <div className={cn(
      'space-y-3 rounded-lg border p-4',
      variant === 'fine' ? 'border-destructive/30 bg-destructive/5' : 'border-border'
    )}>
      <div className="flex items-start gap-3">
        {/* Rank */}
        <div className="w-20 flex-shrink-0">
          <Label htmlFor={`${prefix}-rank-${index}`} className="text-xs text-muted-foreground">
            {t('position')}
          </Label>
          <Input
            id={`${prefix}-rank-${index}`}
            type="number"
            min={1}
            max={10}
            value={tier.rank}
            onChange={(e) => onUpdate(index, 'rank', parseInt(e.target.value) || 1)}
            className="mt-1"
          />
        </div>

        {/* Amount (in Kč) */}
        <div className="flex-1">
          <Label htmlFor={`${prefix}-amount-${index}`} className="text-xs text-muted-foreground">
            {t('amount')}
          </Label>
          <Input
            id={`${prefix}-amount-${index}`}
            type="text"
            value={formatAmount(tier.amount, locale)}
            onChange={(e) => {
              const amount = parseAmount(e.target.value)
              onUpdate(index, 'amount', amount)
            }}
            className={cn('mt-1', variant === 'fine' && 'border-destructive/30')}
            placeholder={variant === 'prize' ? '1 000' : '100'}
          />
        </div>

        {/* Label (optional) */}
        <div className="flex-1">
          <Label htmlFor={`${prefix}-label-${index}`} className="text-xs text-muted-foreground">
            {t('label')}
          </Label>
          <Input
            id={`${prefix}-label-${index}`}
            type="text"
            maxLength={100}
            value={tier.label || ''}
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
