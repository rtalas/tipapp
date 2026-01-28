'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { createEvaluator } from '@/actions/evaluators'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EvaluatorType {
  id: number
  name: string
}

interface League {
  id: number
  name: string
}

interface EvaluatorCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  league?: League
  leagues: League[]
  evaluatorTypes: EvaluatorType[]
}

/**
 * Dialog for creating new evaluators with support for both simple point-based
 * and rank-based scoring configurations (for scorer evaluators).
 */
export function EvaluatorCreateDialog({
  open,
  onOpenChange,
  league,
  leagues,
  evaluatorTypes,
}: EvaluatorCreateDialogProps) {
  const t = useTranslations('admin.evaluators')
  const tCommon = useTranslations('admin.common')

  const [createForm, setCreateForm] = useState({
    leagueId: league?.id.toString() || '',
    evaluatorTypeId: '',
    name: '',
    points: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [useRankBased, setUseRankBased] = useState(false)
  const [rankEntries, setRankEntries] = useState<Array<{ rank: number; points: number }>>([
    { rank: 1, points: 0 },
  ])
  const [unrankedPoints, setUnrankedPoints] = useState<string>('')

  // Update leagueId when league prop changes
  useEffect(() => {
    if (league) {
      setCreateForm((prev) => ({ ...prev, leagueId: league.id.toString() }))
    }
  }, [league])

  const handleCreateEvaluator = async () => {
    if (!createForm.leagueId || !createForm.evaluatorTypeId || !createForm.name) {
      toast.error(t('validation.requiredFields'))
      return
    }

    const isScorer = evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'scorer'

    // Validate based on mode
    if (useRankBased && isScorer) {
      if (rankEntries.length === 0 || !unrankedPoints) {
        toast.error(t('validation.rankConfigRequired'))
        return
      }
      if (isNaN(Number(unrankedPoints))) {
        toast.error(t('validation.invalidUnrankedPoints'))
        return
      }
    } else {
      if (!createForm.points || isNaN(Number(createForm.points))) {
        toast.error(t('validation.pointsInvalid'))
        return
      }
    }

    setIsCreating(true)
    try {
      const config = useRankBased && isScorer
        ? {
            rankedPoints: Object.fromEntries(
              rankEntries.map(e => [String(e.rank), e.points])
            ),
            unrankedPoints: parseInt(unrankedPoints, 10),
          }
        : null

      await createEvaluator({
        leagueId: parseInt(createForm.leagueId, 10),
        evaluatorTypeId: parseInt(createForm.evaluatorTypeId, 10),
        name: createForm.name,
        points: parseInt(createForm.points, 10) || 0,
        config,
      })
      toast.success(t('toast.created'))
      onOpenChange(false)

      // Reset form
      setCreateForm({
        leagueId: league?.id.toString() || '',
        evaluatorTypeId: '',
        name: '',
        points: ''
      })
      setUseRankBased(false)
      setRankEntries([{ rank: 1, points: 0 }])
      setUnrankedPoints('')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('toast.createFailed'))
      }
      logger.error('Failed to create evaluator', { error })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.createTitle')}</DialogTitle>
          <DialogDescription>
            {league
              ? t('descriptionLeague', { leagueName: league.name })
              : t('dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!league && (
            <div>
              <label className="text-sm font-medium">{t('form.leagueLabel')}</label>
              <Select
                value={createForm.leagueId}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, leagueId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectLeague')} />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((lg) => (
                    <SelectItem key={lg.id} value={lg.id.toString()}>
                      {lg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">{t('form.typeLabel')}</label>
            <Select
              value={createForm.evaluatorTypeId}
              onValueChange={(value) =>
                setCreateForm({ ...createForm, evaluatorTypeId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('form.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {evaluatorTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">{t('form.nameLabel')}</label>
            <Input
              placeholder={t('form.nameExample')}
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('form.pointsLabel')}</label>
            <Input
              type="number"
              min="0"
              placeholder={t('form.pointsExample')}
              value={createForm.points}
              onChange={(e) =>
                setCreateForm({ ...createForm, points: e.target.value })
              }
              disabled={useRankBased && evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'scorer'}
            />
          </div>

          {/* Rank-based configuration for scorer */}
          {evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'scorer' && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={useRankBased}
                  onCheckedChange={(checked) => {
                    setUseRankBased(checked)
                    if (!checked) {
                      setRankEntries([{ rank: 1, points: 0 }])
                      setUnrankedPoints('')
                    }
                  }}
                  id="rank-based-mode"
                />
                <Label htmlFor="rank-based-mode" className="text-sm">
                  {t('form.useRankBased')}
                </Label>
              </div>

              {useRankBased && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t('form.rankedPlayers')}</Label>
                    {rankEntries.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder={t('form.rankPlaceholder')}
                          value={entry.rank}
                          onChange={(e) => {
                            const updated = [...rankEntries]
                            updated[index].rank = parseInt(e.target.value) || 0
                            setRankEntries(updated)
                          }}
                          className="w-20"
                          min={1}
                        />
                        <span>→</span>
                        <Input
                          type="number"
                          placeholder={t('form.pointsPlaceholder')}
                          value={entry.points}
                          onChange={(e) => {
                            const updated = [...rankEntries]
                            updated[index].points = parseInt(e.target.value) || 0
                            setRankEntries(updated)
                          }}
                          className="w-20"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-muted-foreground">pts</span>
                        {rankEntries.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setRankEntries(rankEntries.filter((_, i) => i !== index))}
                          >
                            ✕
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const maxRank = Math.max(...rankEntries.map(e => e.rank), 0)
                        setRankEntries([...rankEntries, { rank: maxRank + 1, points: 0 }])
                      }}
                      className="w-full"
                    >
                      + {t('form.addRank')}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">{t('form.unrankedPlayers')}</Label>
                    <Input
                      type="number"
                      placeholder={t('form.unrankedPointsPlaceholder')}
                      value={unrankedPoints}
                      onChange={(e) => setUnrankedPoints(e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            {tCommon('button.cancel')}
          </Button>
          <Button onClick={handleCreateEvaluator} disabled={isCreating}>
            {isCreating ? tCommon('creating') : tCommon('button.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
