'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createEvaluator,
  updateEvaluatorPoints,
  updateEvaluatorName,
  updateEvaluatorConfig,
  deleteEvaluator,
} from '@/actions/evaluators'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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

interface EvaluatorType {
  id: number
  name: string
}

interface League {
  id: number
  name: string
}

interface ScorerRankedConfig {
  rankedPoints: Record<string, number>
  unrankedPoints: number
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
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [evaluatorToDelete, setEvaluatorToDelete] = useState<Evaluator | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
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
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditNameValue('')
    setEditPointsValue('')
  }

  const handleSave = async (evaluatorId: number, originalName: string, originalPoints: number) => {
    const nameChanged = editNameValue.trim() !== originalName
    const pointsChanged = editPointsValue !== String(originalPoints)

    if (!nameChanged && !pointsChanged) {
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

    setIsSaving(true)
    try {
      // Update both fields if changed
      if (nameChanged) {
        await updateEvaluatorName({ evaluatorId, name: editNameValue })
      }
      if (pointsChanged) {
        await updateEvaluatorPoints({ evaluatorId, points: parseInt(editPointsValue, 10) })
      }

      toast.success(t('toast.updated'))
      setEditingId(null)
      setEditNameValue('')
      setEditPointsValue('')
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

  const handleCreateEvaluator = async () => {
    if (!createForm.leagueId || !createForm.evaluatorTypeId || !createForm.name) {
      toast.error(t('validation.requiredFields'))
      return
    }

    const isScorer = evaluatorTypes.find(t => t.id.toString() === createForm.evaluatorTypeId)?.name === 'scorer'

    // Validate based on mode
    if (useRankBased && isScorer) {
      if (rankEntries.length === 0 || !unrankedPoints) {
        toast.error('Please configure rank points and unranked points')
        return
      }
      if (isNaN(Number(unrankedPoints))) {
        toast.error('Invalid unranked points value')
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
      setCreateDialogOpen(false)
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
                  {filteredEvaluators.map((evaluator) => (
                    <TableRow key={evaluator.id} className="table-row-hover">
                      {!league && (
                        <TableCell>
                          <Badge variant="secondary">{evaluator.League.name}</Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        {editingId === evaluator.id ? (
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
                        {editingId === evaluator.id ? (
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
                  ))}
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
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
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
                    Use rank-based scoring
                  </Label>
                </div>

                {useRankBased && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Ranked Players</Label>
                      {rankEntries.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Rank"
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
                            placeholder="Points"
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
                        + Add Rank
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Unranked Players</Label>
                      <Input
                        type="number"
                        placeholder="Points for unranked scorers"
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
              onClick={() => setCreateDialogOpen(false)}
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
    </>
  )
}
