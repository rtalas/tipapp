'use client'

import { useState } from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  updateEvaluatorPoints,
  updateEvaluatorName,
  updateEvaluator,
  deleteEvaluator,
} from '@/actions/evaluators'
import { logger } from '@/lib/logging/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EvaluatorCreateDialog } from './evaluator-create-dialog'
import type { ScorerRankedConfig, GroupStageConfig, ExactPlayerConfig } from '@/lib/evaluators/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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

interface Evaluator {
  id: number
  name: string
  points: number
  entity: string
  leagueId: number
  evaluatorTypeId: number
  config: unknown // Prisma JsonValue
  EvaluatorType: EvaluatorType
  League: League
}

interface EvaluatorsContentProps {
  evaluators: Evaluator[]
  leagues: League[]
  evaluatorTypes: EvaluatorType[]
  league?: League
}

export function EvaluatorsContent({
  evaluators,
  leagues,
  evaluatorTypes,
  league,
}: EvaluatorsContentProps) {
  const t = useTranslations('admin.evaluators')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPointsValue, setEditPointsValue] = useState<string>('')
  const [editNameValue, setEditNameValue] = useState<string>('')
  const [editConfig, setEditConfig] = useState<ScorerRankedConfig | null>(null)
  const [editExactPlayerConfig, setEditExactPlayerConfig] = useState<ExactPlayerConfig | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Get sport ID from league
  const sportId = league?.sportId
  const availablePositions = sportId ? (POSITIONS_BY_SPORT[sportId] || []) : []
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [evaluatorToDelete, setEvaluatorToDelete] = useState<Evaluator | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Filter evaluators with optimized string search
  const filteredEvaluators = evaluators.filter((evaluator) => {
    // League filter (only if not on league-specific page)
    if (!league && leagueFilter !== 'all' && evaluator.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // Search filter - optimized: combine searchable fields
    if (search) {
      const searchLower = search.toLowerCase()
      const searchableText = `${evaluator.name} ${evaluator.League.name} ${evaluator.EvaluatorType.name}`.toLowerCase()
      return searchableText.includes(searchLower)
    }

    return true
  })

  const handleStartEdit = (evaluator: Evaluator) => {
    setEditingId(evaluator.id)
    setEditNameValue(evaluator.name)
    setEditPointsValue(String(evaluator.points))

    // Initialize config for scorer evaluators
    const isScorer = evaluator.EvaluatorType.name === 'scorer'
    const isExactPlayer = evaluator.EvaluatorType.name === 'exact_player'

    if (isScorer) {
      if (evaluator.config && typeof evaluator.config === 'object') {
        setEditConfig(evaluator.config as ScorerRankedConfig)
      } else {
        // Initialize default config
        setEditConfig({
          rankedPoints: { '1': evaluator.points },
          unrankedPoints: evaluator.points,
        })
      }
      setEditExactPlayerConfig(null)
    } else if (isExactPlayer) {
      if (evaluator.config && typeof evaluator.config === 'object' && 'positions' in evaluator.config) {
        setEditExactPlayerConfig(evaluator.config as ExactPlayerConfig)
      } else {
        setEditExactPlayerConfig({ positions: null })
      }
      setEditConfig(null)
    } else {
      setEditConfig(null)
      setEditExactPlayerConfig(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditNameValue('')
    setEditPointsValue('')
    setEditConfig(null)
    setEditExactPlayerConfig(null)
  }

  const handleSave = async (evaluatorId: number, originalName: string, originalPoints: number) => {
    const nameChanged = editNameValue.trim() !== originalName
    const pointsChanged = editPointsValue !== String(originalPoints)
    const hasConfig = editConfig !== null
    const hasExactPlayerConfig = editExactPlayerConfig !== null

    if (!nameChanged && !pointsChanged && !hasConfig && !hasExactPlayerConfig) {
      handleCancelEdit()
      return
    }

    if (!editNameValue.trim()) {
      toast.error(t('validation.nameRequired'))
      return
    }

    if (!editPointsValue || isNaN(Number(editPointsValue))) {
      toast.error(t('validation.invalidNumber'))
      return
    }

    // Validate config if present
    if (hasConfig && editConfig) {
      if (Object.keys(editConfig.rankedPoints).length === 0) {
        toast.error('At least one ranking level is required')
        return
      }
    }

    setIsSaving(true)
    try {
      // If editing scorer with config, use updateEvaluator which supports config
      if (hasConfig) {
        // For scorers with config, set points to 0 since actual points come from config
        await updateEvaluator({
          evaluatorId,
          name: editNameValue.trim(),
          points: 0,
          config: editConfig,
        })
      } else if (hasExactPlayerConfig) {
        // For exact_player with position filter
        await updateEvaluator({
          evaluatorId,
          name: editNameValue.trim(),
          points: parseInt(editPointsValue, 10),
          config: editExactPlayerConfig,
        })
      } else {
        // For non-scorer evaluators, use the old method
        if (nameChanged) {
          await updateEvaluatorName({ evaluatorId, name: editNameValue })
        }
        if (pointsChanged) {
          await updateEvaluatorPoints({ evaluatorId, points: parseInt(editPointsValue, 10) })
        }
      }

      toast.success(t('toast.updated'))
      setEditingId(null)
      setEditNameValue('')
      setEditPointsValue('')
      setEditConfig(null)
      setEditExactPlayerConfig(null)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('toast.updateFailed'))
      }
      logger.error('Failed to update evaluator', { error, evaluatorId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!evaluatorToDelete) return
    setIsDeleting(true)
    try {
      await deleteEvaluator({ id: evaluatorToDelete.id })
      toast.success(t('toast.deleted'))
      setDeleteDialogOpen(false)
      setEvaluatorToDelete(null)
    } catch (error) {
      toast.error(t('toast.deleteFailed'))
      logger.error('Failed to delete evaluator', { error, evaluatorId: evaluatorToDelete?.id })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      {/* Header with Create Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row">
          <Input
            placeholder={league ? t('searchPlaceholderLeague') : t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {!league && (
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('table.league')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allLeagues')}</SelectItem>
                {leagues.map((lg) => (
                  <SelectItem key={lg.id} value={lg.id.toString()}>
                    {lg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addButton')}
        </Button>
      </div>

      {/* Evaluators Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {league
              ? t('descriptionLeague', { leagueName: league.name })
              : t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvaluators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('noEvaluatorsFound')}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!league && <TableHead>{t('table.league')}</TableHead>}
                    <TableHead>{t('table.ruleName')}</TableHead>
                    <TableHead>{t('table.type')}</TableHead>
                    <TableHead className="text-center">{t('table.points')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluators.map((evaluator) => {
                    const isEditingThisRow = editingId === evaluator.id
                    const isEditingScorer = isEditingThisRow && editConfig !== null
                    const isEditingExactPlayer = isEditingThisRow && editExactPlayerConfig !== null

                    // For exact_player evaluators being edited, show full-width row
                    if (isEditingExactPlayer) {
                      return (
                        <TableRow key={evaluator.id} className="table-row-hover">
                          <TableCell colSpan={league ? 4 : 5} className="p-4">
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Rule Name</Label>
                                <Input
                                  type="text"
                                  value={editNameValue}
                                  onChange={(e) => setEditNameValue(e.target.value)}
                                  className="h-8 mt-1"
                                  disabled={isSaving}
                                  aria-label="Evaluator name"
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Points</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={editPointsValue}
                                  onChange={(e) => setEditPointsValue(e.target.value)}
                                  className="w-20 h-8 mt-1"
                                  disabled={isSaving}
                                  aria-label="Points value"
                                />
                              </div>

                              <div>
                                <Label className="text-sm font-medium">Position Filter (Optional)</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Select positions to filter which players can be selected for this bet
                                </p>
                                <div className="space-y-2">
                                  {availablePositions.map((position) => {
                                    const isChecked = editExactPlayerConfig?.positions?.includes(position.value) ?? false
                                    return (
                                      <div key={position.value} className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`edit-position-${position.value}`}
                                          checked={isChecked}
                                          onCheckedChange={(checked) => {
                                            const currentPositions = editExactPlayerConfig?.positions || []
                                            if (checked) {
                                              setEditExactPlayerConfig({
                                                positions: [...currentPositions, position.value]
                                              })
                                            } else {
                                              const newPositions = currentPositions.filter(p => p !== position.value)
                                              setEditExactPlayerConfig({
                                                positions: newPositions.length > 0 ? newPositions : null
                                              })
                                            }
                                          }}
                                          disabled={isSaving}
                                        />
                                        <Label
                                          htmlFor={`edit-position-${position.value}`}
                                          className="text-sm font-normal cursor-pointer"
                                        >
                                          {position.label} ({position.value})
                                        </Label>
                                      </div>
                                    )
                                  })}
                                </div>
                                {(!editExactPlayerConfig?.positions || editExactPlayerConfig.positions.length === 0) && (
                                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                                    No positions selected - all players will be available for this bet
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  disabled={isSaving}
                                >
                                  {tCommon('cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleSave(evaluator.id, evaluator.name, evaluator.points)}
                                  disabled={isSaving}
                                >
                                  {tCommon('save')}
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    // For scorer evaluators being edited, show full-width row
                    if (isEditingScorer) {
                      return (
                        <TableRow key={evaluator.id} className="table-row-hover">
                          <TableCell colSpan={league ? 4 : 5} className="p-4">
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Rule Name</label>
                                <Input
                                  type="text"
                                  value={editNameValue}
                                  onChange={(e) => setEditNameValue(e.target.value)}
                                  className="h-8 mt-1"
                                  disabled={isSaving}
                                  aria-label="Evaluator name"
                                />
                              </div>

                              <div>
                                <label className="text-sm font-medium">Ranking Points</label>
                                <div className="space-y-2 mt-2">
                                  {editConfig && Object.entries(editConfig.rankedPoints)
                                    .sort(([a], [b]) => Number(a) - Number(b))
                                    .map(([rank, points]) => (
                                      <div key={rank} className="flex items-center gap-2">
                                        <span className="text-sm font-medium w-16">Rank {rank}:</span>
                                        <Input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={points}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value, 10)
                                            if (!isNaN(val) && editConfig) {
                                              setEditConfig({
                                                ...editConfig,
                                                rankedPoints: {
                                                  ...editConfig.rankedPoints,
                                                  [rank]: val,
                                                },
                                              })
                                            }
                                          }}
                                          className="w-20 h-8"
                                          disabled={isSaving}
                                        />
                                        <span className="text-sm text-muted-foreground">pts</span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            if (editConfig && Object.keys(editConfig.rankedPoints).length > 1) {
                                              const newRankedPoints = { ...editConfig.rankedPoints }
                                              delete newRankedPoints[rank]
                                              setEditConfig({
                                                ...editConfig,
                                                rankedPoints: newRankedPoints,
                                              })
                                            }
                                          }}
                                          disabled={isSaving || (editConfig && Object.keys(editConfig.rankedPoints).length === 1)}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    ))}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (editConfig) {
                                        const existingRanks = Object.keys(editConfig.rankedPoints).map(Number)
                                        const nextRank = existingRanks.length > 0 ? Math.max(...existingRanks) + 1 : 1
                                        setEditConfig({
                                          ...editConfig,
                                          rankedPoints: {
                                            ...editConfig.rankedPoints,
                                            [nextRank.toString()]: 0,
                                          },
                                        })
                                      }
                                    }}
                                    disabled={isSaving}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Rank
                                  </Button>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium">Unranked Points</label>
                                <div className="flex items-center gap-2 mt-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={editConfig?.unrankedPoints || 0}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10)
                                      if (!isNaN(val) && editConfig) {
                                        setEditConfig({
                                          ...editConfig,
                                          unrankedPoints: val,
                                        })
                                      }
                                    }}
                                    className="w-20 h-8"
                                    disabled={isSaving}
                                  />
                                  <span className="text-sm text-muted-foreground">pts for unranked scorers</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEdit}
                                  disabled={isSaving}
                                >
                                  {tCommon('cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleSave(evaluator.id, evaluator.name, evaluator.points)}
                                  disabled={isSaving}
                                >
                                  {tCommon('save')}
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    // Normal row display or simple inline editing
                    return (
                      <TableRow key={evaluator.id} className="table-row-hover">
                        {!league && (
                          <TableCell>
                            <Badge variant="secondary">{evaluator.League.name}</Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          {isEditingThisRow ? (
                            <Input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="h-8"
                              disabled={isSaving}
                              autoFocus
                              aria-label="Evaluator name"
                            />
                          ) : (
                            <span className="font-medium">{evaluator.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {evaluator.EvaluatorType.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {isEditingThisRow ? (
                            <Input
                              type="number"
                              min="0"
                              value={editPointsValue}
                              onChange={(e) => setEditPointsValue(e.target.value)}
                              className="w-20 h-8 text-center mx-auto"
                              disabled={isSaving}
                              aria-label="Points value"
                            />
                          ) : evaluator.config && evaluator.EvaluatorType.name === 'scorer' ? (
                            <span className="text-xs font-mono">
                              {(() => {
                                const config = evaluator.config as ScorerRankedConfig
                                return Object.entries(config.rankedPoints)
                                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                  .map(([rank, pts]) => `R${rank}:${pts}`)
                                  .join(' ') + ` U:${config.unrankedPoints}`
                              })()}
                            </span>
                          ) : evaluator.config && evaluator.EvaluatorType.name === 'group_stage_team' ? (
                            <span className="text-xs font-mono">
                              {(() => {
                                const config = evaluator.config as GroupStageConfig
                                return `W:${config.winnerPoints} A:${config.advancePoints}`
                              })()}
                            </span>
                          ) : evaluator.config && typeof evaluator.config === 'object' && evaluator.config !== null && evaluator.EvaluatorType.name === 'exact_player' && 'positions' in evaluator.config ? (
                            <div className="text-xs">
                              <span className="font-mono font-bold">{evaluator.points}</span>
                              {(() => {
                                const config = evaluator.config as ExactPlayerConfig
                                if (config.positions && config.positions.length > 0) {
                                  return (
                                    <div className="text-muted-foreground mt-0.5">
                                      Pos: {config.positions.join(', ')}
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          ) : (
                            <span className="font-mono font-bold">{evaluator.points}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                          {editingId === evaluator.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                aria-label="Cancel editing"
                              >
                                {tCommon('button.cancel')}
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSave(evaluator.id, evaluator.name, evaluator.points)}
                                disabled={isSaving}
                                aria-label="Save changes"
                              >
                                {isSaving ? tCommon('saving') : tCommon('button.save')}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(evaluator)}
                                aria-label={`Edit evaluator: ${evaluator.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEvaluatorToDelete(evaluator)
                                  setDeleteDialogOpen(true)
                                }}
                                aria-label={`Delete evaluator: ${evaluator.name}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{evaluatorToDelete?.name}&quot;
              {!league && ` from ${evaluatorToDelete?.League.name}`}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tCommon('button.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? tCommon('deleting') : tCommon('button.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Evaluator Dialog */}
      <EvaluatorCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        league={league}
        leagues={leagues}
        evaluatorTypes={evaluatorTypes}
      />
    </>
  )
}
