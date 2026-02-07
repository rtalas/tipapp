'use client'

import { useState } from 'react'
import { Plus, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrizeTierRow } from './prize-tier-row'
import type { PrizeTier } from '@/lib/validation/admin'

interface LeaguePrizesSectionProps {
  prizes: PrizeTier[]
  onChange: (prizes: PrizeTier[]) => void
}

export function LeaguePrizesSection({ prizes, onChange }: LeaguePrizesSectionProps) {
  const [errors, setErrors] = useState<Record<number, string>>({})

  // Add a new prize tier with next available rank
  const handleAddPrize = () => {
    if (prizes.length >= 10) {
      return // Maximum 10 prize tiers
    }

    // Find next available rank (1-10)
    const usedRanks = new Set(prizes.map(p => p.rank))
    let nextRank = 1
    while (usedRanks.has(nextRank) && nextRank <= 10) {
      nextRank++
    }

    const newPrize: PrizeTier = {
      rank: nextRank,
      amount: 0,
      currency: 'CZK',
      label: undefined,
      type: 'prize',
    }

    onChange([...prizes, newPrize])
    setErrors({})
  }

  // Update a specific prize field
  const handleUpdatePrize = (index: number, field: keyof PrizeTier, value: number | string) => {
    const updatedPrizes = [...prizes]

    if (field === 'rank' || field === 'amount') {
      updatedPrizes[index] = { ...updatedPrizes[index], [field]: value as number }
    } else if (field === 'label') {
      updatedPrizes[index] = { ...updatedPrizes[index], [field]: (value as string) || undefined }
    } else if (field === 'currency') {
      updatedPrizes[index] = { ...updatedPrizes[index], [field]: value as string }
    }

    // Clear errors when updating
    setErrors({})

    // Validate for duplicate ranks
    const ranks = updatedPrizes.map(p => p.rank)
    const duplicates = ranks.filter((rank, idx) => ranks.indexOf(rank) !== idx)

    if (duplicates.length > 0) {
      const newErrors: Record<number, string> = {}
      updatedPrizes.forEach((prize, idx) => {
        if (duplicates.includes(prize.rank)) {
          newErrors[idx] = `Position ${prize.rank} is already used`
        }
      })
      setErrors(newErrors)
    }

    onChange(updatedPrizes)
  }

  // Remove a prize tier
  const handleRemovePrize = (index: number) => {
    const updatedPrizes = prizes.filter((_, idx) => idx !== index)
    onChange(updatedPrizes)
    setErrors({})
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Prize Settings
        </h4>
        <span className="text-xs text-muted-foreground">
          {prizes.length} / 10 tiers
        </span>
      </div>

      {/* Prize tiers list */}
      {prizes.length > 0 ? (
        <div className="space-y-3">
          {prizes.map((prize, index) => (
            <PrizeTierRow
              key={prize.rank}
              prize={prize}
              index={index}
              onUpdate={handleUpdatePrize}
              onRemove={handleRemovePrize}
              error={errors[index]}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No prizes configured for this league
          </p>
          <p className="text-xs text-muted-foreground">
            Add prize tiers to display on the leaderboard
          </p>
        </div>
      )}

      {/* Add prize button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddPrize}
        disabled={prizes.length >= 10}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Prize Tier
        {prizes.length >= 10 && ' (Maximum reached)'}
      </Button>

      {/* Validation message */}
      {Object.keys(errors).length > 0 && (
        <p className="text-sm text-destructive" role="alert">
          Please fix duplicate prize positions before saving
        </p>
      )}
    </div>
  )
}
