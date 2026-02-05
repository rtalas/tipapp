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
import { Checkbox } from '@/components/ui/checkbox'
import { POSITIONS_BY_SPORT } from '@/lib/constants'

interface EvaluatorType {
  id: number
  name: string
}

interface League {
  id: number
  name: string
  sportId: number
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

  // Group stage config
  const [winnerPoints, setWinnerPoints] = useState<string>('')
  const [advancePoints, setAdvancePoints] = useState<string>('')

  // Exact player position filter config
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])

  // Get sport ID from selected league
  const selectedLeagueId = createForm.leagueId ? parseInt(createForm.leagueId, 10) : league?.id
  const selectedLeague = leagues.find(l => l.id === selectedLeagueId) || league
  const sportId = selectedLeague?.sportId
  const availablePositions = sportId ? (POSITIONS_BY_SPORT[sportId] || []) : []

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

    const selectedType = evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)
    const isScorer = selectedType?.name === 'scorer'
    const isGroupStage = selectedType?.name === 'group_stage_team'
    const isExactPlayer = selectedType?.name === 'exact_player'

    // Validate based on evaluator type
    if (useRankBased && isScorer) {
      if (rankEntries.length === 0 || !unrankedPoints) {
        toast.error(t('validation.rankConfigRequired'))
        return
      }
      if (isNaN(Number(unrankedPoints))) {
        toast.error(t('validation.invalidUnrankedPoints'))
        return
      }
    } else if (isGroupStage) {
      // Validate group stage config
      if (!winnerPoints || !advancePoints) {
        toast.error('Winner points and advance points are required for group stage evaluator')
        return
      }
      const winner = Number(winnerPoints)
      const advance = Number(advancePoints)
      if (isNaN(winner) || isNaN(advance)) {
        toast.error('Points must be valid numbers')
        return
      }
      if (winner <= advance) {
        toast.error('Winner points must be greater than advance points')
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
      let config = null

      if (useRankBased && isScorer) {
        config = {
          rankedPoints: Object.fromEntries(
            rankEntries.map(e => [String(e.rank), e.points])
          ),
          unrankedPoints: parseInt(unrankedPoints, 10),
        }
      } else if (isGroupStage) {
        config = {
          winnerPoints: parseInt(winnerPoints, 10),
          advancePoints: parseInt(advancePoints, 10),
        }
      } else if (isExactPlayer && selectedPositions.length > 0) {
        config = {
          positions: selectedPositions,
        }
      }

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
      setWinnerPoints('')
      setAdvancePoints('')
      setSelectedPositions([])
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
              disabled={
                (useRankBased && evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'scorer') ||
                evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'group_stage_team'
              }
            />
            {evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'group_stage_team' && (
              <p className="text-xs text-muted-foreground mt-1">
                Points are configured separately for winner and advance below
              </p>
            )}
          </div>

          {/* Group stage configuration */}
          {evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'group_stage_team' && (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Group Stage Points Configuration</Label>
                <p className="text-xs text-muted-foreground">
                  Configure tiered scoring for group stage predictions
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="winner-points" className="text-xs">
                  Winner Points (if predicted team wins group)
                </Label>
                <Input
                  id="winner-points"
                  type="number"
                  placeholder="10"
                  value={winnerPoints}
                  onChange={(e) => setWinnerPoints(e.target.value)}
                  min={1}
                  max={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advance-points" className="text-xs">
                  Advance Points (if team advances but doesn't win)
                </Label>
                <Input
                  id="advance-points"
                  type="number"
                  placeholder="5"
                  value={advancePoints}
                  onChange={(e) => setAdvancePoints(e.target.value)}
                  min={1}
                  max={100}
                />
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                <strong>Example:</strong> Winner points = 10, Advance points = 5
                <br />
                • User predicts Team A, Team A wins group → <strong>10 pts</strong>
                <br />
                • User predicts Team B, Team B advances (2nd/3rd) → <strong>5 pts</strong>
                <br />
                • User predicts Team C, Team C doesn't advance → <strong>0 pts</strong>
              </div>
            </div>
          )}

          {/* Position filter for exact_player */}
          {evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'exact_player' && availablePositions.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Position Filter (Optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Select positions to filter which players can be selected for this bet
                </p>
              </div>

              <div className="space-y-2">
                {availablePositions.map((position) => (
                  <div key={position.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`position-${position.value}`}
                      checked={selectedPositions.includes(position.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPositions([...selectedPositions, position.value])
                        } else {
                          setSelectedPositions(selectedPositions.filter(p => p !== position.value))
                        }
                      }}
                    />
                    <Label
                      htmlFor={`position-${position.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {position.label} ({position.value})
                    </Label>
                  </div>
                ))}
              </div>

              {selectedPositions.length === 0 && (
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  No positions selected - all players will be available for this bet
                </p>
              )}
            </div>
          )}

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
