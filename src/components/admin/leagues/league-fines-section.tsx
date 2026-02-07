'use client'

import { useState } from 'react'
import { Plus, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { FineTierRow } from './fine-tier-row'
import type { PrizeTier } from '@/lib/validation/admin'

interface LeagueFinesSectionProps {
  fines: PrizeTier[]
  onChange: (fines: PrizeTier[]) => void
}

export function LeagueFinesSection({ fines, onChange }: LeagueFinesSectionProps) {
  const t = useTranslations('admin.leagueActions.finesSection')
  const [errors, setErrors] = useState<Record<number, string>>({})

  // Add a new fine tier with next available rank
  const handleAddFine = () => {
    if (fines.length >= 10) {
      return // Maximum 10 fine tiers
    }

    // Find next available rank (1-10)
    const usedRanks = new Set(fines.map(f => f.rank))
    let nextRank = 1
    while (usedRanks.has(nextRank) && nextRank <= 10) {
      nextRank++
    }

    const newFine: PrizeTier = {
      rank: nextRank,
      amount: 0,
      currency: 'CZK',
      label: undefined,
      type: 'fine',
    }

    onChange([...fines, newFine])
    setErrors({})
  }

  // Update a specific fine field
  const handleUpdateFine = (index: number, field: keyof PrizeTier, value: number | string) => {
    const updatedFines = [...fines]

    if (field === 'rank' || field === 'amount') {
      updatedFines[index] = { ...updatedFines[index], [field]: value as number }
    } else if (field === 'label') {
      updatedFines[index] = { ...updatedFines[index], [field]: (value as string) || undefined }
    } else if (field === 'currency') {
      updatedFines[index] = { ...updatedFines[index], [field]: value as string }
    }

    // Clear errors when updating
    setErrors({})

    // Validate for duplicate ranks
    const ranks = updatedFines.map(f => f.rank)
    const duplicates = ranks.filter((rank, idx) => ranks.indexOf(rank) !== idx)

    if (duplicates.length > 0) {
      const newErrors: Record<number, string> = {}
      updatedFines.forEach((fine, idx) => {
        if (duplicates.includes(fine.rank)) {
          newErrors[idx] = t('positionUsed', { rank: fine.rank })
        }
      })
      setErrors(newErrors)
    }

    onChange(updatedFines)
  }

  // Remove a fine tier
  const handleRemoveFine = (index: number) => {
    const updatedFines = fines.filter((_, idx) => idx !== index)
    onChange(updatedFines)
    setErrors({})
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {t('title')}
        </h4>
        <span className="text-xs text-muted-foreground">
          {t('tiers', { count: fines.length })}
        </span>
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <p className="mb-1">
          <strong>{t('howItWorks')}</strong> {t('howItWorksText')}
        </p>
        <p>
          {t('positionExplain')}
        </p>
      </div>

      {/* Fine tiers list */}
      {fines.length > 0 ? (
        <div className="space-y-3">
          {fines.map((fine, index) => (
            <FineTierRow
              key={fine.rank}
              fine={fine}
              index={index}
              onUpdate={handleUpdateFine}
              onRemove={handleRemoveFine}
              error={errors[index]}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {t('noFines')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('noFinesHelper')}
          </p>
        </div>
      )}

      {/* Add fine button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddFine}
        disabled={fines.length >= 10}
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        <Plus className="h-4 w-4 mr-2" />
        {t('addTier')}
        {fines.length >= 10 && t('maximumReached')}
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
