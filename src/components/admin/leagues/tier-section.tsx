'use client'

import { useState } from 'react'
import { Plus, Trophy, AlertTriangle, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TierRow } from './tier-row'
import type { PrizeTier } from '@/lib/validation/admin'
import { MAX_PRIZE_TIERS } from '@/lib/constants'

type TierVariant = 'prize' | 'fine'

const variantConfig: Record<TierVariant, {
  type: PrizeTier['type']
  icon: LucideIcon
  iconClassName?: string
  emptyBorderClassName: string
  emptyBgClassName: string
  buttonClassName?: string
  translationNamespace: string
}> = {
  prize: {
    type: 'prize',
    icon: Trophy,
    emptyBorderClassName: 'border-border',
    emptyBgClassName: '',
    translationNamespace: 'admin.leagueActions.prizesSection',
  },
  fine: {
    type: 'fine',
    icon: AlertTriangle,
    iconClassName: 'text-destructive',
    emptyBorderClassName: 'border-destructive/30',
    emptyBgClassName: 'bg-destructive/5',
    buttonClassName: 'border-destructive/30 text-destructive hover:bg-destructive/10',
    translationNamespace: 'admin.leagueActions.finesSection',
  },
}

interface TierSectionProps {
  variant: TierVariant
  tiers: PrizeTier[]
  onChange: (tiers: PrizeTier[]) => void
}

export function TierSection({ variant, tiers, onChange }: TierSectionProps) {
  const config = variantConfig[variant]
  const t = useTranslations(config.translationNamespace)
  const [errors, setErrors] = useState<Record<number, string>>({})
  const Icon = config.icon

  const handleAdd = () => {
    if (tiers.length >= MAX_PRIZE_TIERS) return

    const usedRanks = new Set(tiers.map((t) => t.rank))
    let nextRank = 1
    while (usedRanks.has(nextRank) && nextRank <= MAX_PRIZE_TIERS) {
      nextRank++
    }

    onChange([...tiers, {
      rank: nextRank,
      amount: 0,
      currency: 'CZK',
      label: undefined,
      type: config.type,
    }])
    setErrors({})
  }

  const handleUpdate = (index: number, field: keyof PrizeTier, value: number | string) => {
    const updated = [...tiers]

    if (field === 'rank' || field === 'amount') {
      updated[index] = { ...updated[index], [field]: value as number }
    } else if (field === 'label') {
      updated[index] = { ...updated[index], [field]: (value as string) || undefined }
    } else if (field === 'currency') {
      updated[index] = { ...updated[index], [field]: value as string }
    }

    setErrors({})

    const ranks = updated.map((t) => t.rank)
    const duplicates = ranks.filter((rank, idx) => ranks.indexOf(rank) !== idx)
    if (duplicates.length > 0) {
      const newErrors: Record<number, string> = {}
      updated.forEach((tier, idx) => {
        if (duplicates.includes(tier.rank)) {
          newErrors[idx] = t('positionUsed', { rank: tier.rank })
        }
      })
      setErrors(newErrors)
    }

    onChange(updated)
  }

  const handleRemove = (index: number) => {
    onChange(tiers.filter((_, idx) => idx !== index))
    setErrors({})
  }

  const emptyKey = variant === 'prize' ? 'noPrizes' : 'noFines'
  const emptyHelperKey = variant === 'prize' ? 'noPrizesHelper' : 'noFinesHelper'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Icon className={cn('h-4 w-4', config.iconClassName)} />
          {t('title')}
        </h4>
        <span className="text-xs text-muted-foreground">
          {t('tiers', { count: tiers.length })}
        </span>
      </div>

      {/* Info block for fines */}
      {variant === 'fine' && (
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p className="mb-1">
            <strong>{t('howItWorks')}</strong> {t('howItWorksText')}
          </p>
          <p>{t('positionExplain')}</p>
        </div>
      )}

      {/* Tier rows */}
      {tiers.length > 0 ? (
        <div className="space-y-3">
          {tiers.map((tier, index) => (
            <TierRow
              key={tier.rank}
              tier={tier}
              variant={variant}
              index={index}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              error={errors[index]}
            />
          ))}
        </div>
      ) : (
        <div className={cn(
          'rounded-lg border border-dashed p-6 text-center',
          config.emptyBorderClassName,
          config.emptyBgClassName
        )}>
          <Icon className={cn('mx-auto h-8 w-8 mb-2', config.iconClassName || 'text-muted-foreground/50')} />
          <p className="text-sm text-muted-foreground mb-3">{t(emptyKey)}</p>
          <p className="text-xs text-muted-foreground">{t(emptyHelperKey)}</p>
        </div>
      )}

      {/* Add button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={tiers.length >= MAX_PRIZE_TIERS}
        className={cn('w-full', config.buttonClassName)}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('addTier')}
        {tiers.length >= MAX_PRIZE_TIERS && t('maximumReached')}
      </Button>

      {/* Validation message */}
      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-destructive" role="alert">
          {t('duplicateError')}
        </p>
      )}
    </div>
  )
}
