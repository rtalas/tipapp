'use client'

import React, { useState, useEffect } from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createEvaluator,
  updateEvaluatorPoints,
  updateEvaluatorName,
  deleteEvaluator,
} from '@/actions/evaluators'
import { getEvaluatorTypes } from '@/actions/shared-queries'
import { logger } from '@/lib/client-logger'
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

interface EvaluatorType {
  id: number
  name: string
}

interface League {
  id: number
  name: string
}

interface Evaluator {
  id: number
  name: string
  points: number
  entity: string
  leagueId: number
  evaluatorTypeId: number
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

  const handleCancelEditName = () => {
    setEditingId(null)
    setEditNameValue('')
    setEditPointsValue('')
  }

  const handleCancelEditPoints = () => {
    setEditingId(null)
    setEditNameValue('')
    setEditPointsValue('')
  }

  const handleSavePoints = async (evaluatorId: number) => {
    if (!editPointsValue || isNaN(Number(editPointsValue))) {
      toast.error(t('validation.invalidNumber'))
      return
    }

    setIsSaving(true)
    try {
      await updateEvaluatorPoints({ evaluatorId, points: parseInt(editPointsValue, 10) })
      toast.success(t('toast.pointsUpdated'))
      setEditingId(null)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('toast.pointsUpdateFailed'))
      }
      logger.error('Failed to update evaluator points', { error, evaluatorId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveName = async (evaluatorId: number) => {
    if (!editNameValue.trim()) {
      toast.error(t('validation.nameRequired'))
      return
    }

    setIsSaving(true)
    try {
      await updateEvaluatorName({ evaluatorId, name: editNameValue })
      toast.success(t('toast.nameUpdated'))
      setEditingId(null)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('toast.nameUpdateFailed'))
      }
      logger.error('Failed to update evaluator name', { error, evaluatorId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateEvaluator = async () => {
    if (!createForm.leagueId || !createForm.evaluatorTypeId || !createForm.name || !createForm.points) {
      toast.error(t('validation.requiredFields'))
      return
    }

    if (isNaN(Number(createForm.points))) {
      toast.error(t('validation.pointsInvalid'))
      return
    }

    setIsCreating(true)
    try {
      await createEvaluator({
        leagueId: parseInt(createForm.leagueId, 10),
        evaluatorTypeId: parseInt(createForm.evaluatorTypeId, 10),
        name: createForm.name,
        points: parseInt(createForm.points, 10),
      })
      toast.success(t('toast.created'))
      setCreateDialogOpen(false)
      setCreateForm({
        leagueId: league?.id.toString() || '',
        evaluatorTypeId: '',
        name: '',
        points: ''
      })
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
                    <TableHead className="w-[80px]">{tCommon('common.actions')}</TableHead>
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
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="flex-1 h-8"
                              disabled={isSaving}
                              autoFocus
                              aria-label="Evaluator name"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditName}
                                aria-label="Cancel editing name"
                              >
                                {tCommon('button.cancel')}
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveName(evaluator.id)}
                                disabled={isSaving}
                                aria-label="Save name"
                              >
                                {tCommon('button.save')}
                              </Button>
                            </div>
                          </div>
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
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={editPointsValue}
                              onChange={(e) => setEditPointsValue(e.target.value)}
                              className="w-16 h-8 text-center"
                              disabled={isSaving}
                              aria-label="Points value"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditPoints}
                                aria-label="Cancel editing points"
                              >
                                {tCommon('button.cancel')}
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSavePoints(evaluator.id)}
                                disabled={isSaving}
                                aria-label="Save points"
                              >
                                {tCommon('button.save')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="font-mono font-bold">{evaluator.points}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingId === evaluator.id ? (
                            <span className="text-sm text-muted-foreground">{t('button.editing')}</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(evaluator)}
                              aria-label={`Edit evaluator: ${evaluator.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
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
              Are you sure you want to delete "{evaluatorToDelete?.name}"
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
              />
            </div>
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
