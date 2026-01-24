'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createEvaluator,
  updateEvaluatorPoints,
  updateEvaluatorName,
  deleteEvaluator,
} from '@/actions/evaluators'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface Evaluator {
  id: number
  name: string
  points: number
  evaluatorTypeId: number
  EvaluatorType: EvaluatorType
}

interface LeagueEvaluatorsContentProps {
  leagueId: number
  leagueName: string
  evaluators: Evaluator[]
  evaluatorTypes: EvaluatorType[]
}

export function LeagueEvaluatorsContent({
  leagueId,
  leagueName,
  evaluators,
  evaluatorTypes,
}: LeagueEvaluatorsContentProps) {
  const t = useTranslations('admin.leagueEvaluators')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPointsValue, setEditPointsValue] = useState<string>('')
  const [editNameValue, setEditNameValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [evaluatorToDelete, setEvaluatorToDelete] = useState<Evaluator | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    evaluatorTypeId: '',
    name: '',
    points: '',
  })
  const [isCreating, setIsCreating] = useState(false)

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
      toast.error(t('pointsValidation'))
      return
    }

    setIsSaving(true)
    try {
      await updateEvaluatorPoints({ evaluatorId, points: parseInt(editPointsValue, 10) })
      toast.success(t('pointsUpdated'))
      setEditingId(null)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('evaluatorUpdateFailed'))
      }
      logger.error('Failed to update evaluator points', { error, evaluatorId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveName = async (evaluatorId: number) => {
    if (!editNameValue.trim()) {
      toast.error(t('nameValidation'))
      return
    }

    setIsSaving(true)
    try {
      await updateEvaluatorName({ evaluatorId, name: editNameValue })
      toast.success(t('nameUpdated'))
      setEditingId(null)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('evaluatorUpdateFailed'))
      }
      logger.error('Failed to update evaluator name', { error, evaluatorId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateEvaluator = async () => {
    if (!createForm.evaluatorTypeId || !createForm.name || !createForm.points) {
      toast.error(t('fillValidation'))
      return
    }

    if (isNaN(Number(createForm.points))) {
      toast.error(t('pointsValidation'))
      return
    }

    setIsCreating(true)
    try {
      await createEvaluator({
        leagueId,
        evaluatorTypeId: parseInt(createForm.evaluatorTypeId, 10),
        name: createForm.name,
        points: parseInt(createForm.points, 10),
      })
      toast.success(t('evaluatorCreated'))
      setCreateDialogOpen(false)
      setCreateForm({ evaluatorTypeId: '', name: '', points: '' })
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('evaluatorCreateFailed'))
      }
      logger.error('Failed to create evaluator', { error, leagueId })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!evaluatorToDelete) return
    setIsDeleting(true)
    try {
      await deleteEvaluator({ id: evaluatorToDelete.id })
      toast.success(t('evaluatorDeleted'))
      setDeleteDialogOpen(false)
      setEvaluatorToDelete(null)
    } catch (error) {
      toast.error(t('evaluatorDeleteFailed'))
      logger.error('Failed to delete evaluator', { error, evaluatorId: evaluatorToDelete?.id })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addEvaluator')}
        </Button>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('scoringRules')}</CardTitle>
          <CardDescription>{t('scoringRulesDescription', { leagueName })}</CardDescription>
        </CardHeader>
        <CardContent>
          {evaluators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('noEvaluators')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('noEvaluatorsHelper')}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('ruleName')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead className="text-center">{t('points')}</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluators.map((evaluator) => (
                    <TableRow key={evaluator.id} className="table-row-hover">
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
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveName(evaluator.id)}
                                disabled={isSaving}
                                aria-label="Save name"
                              >
                                Save
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
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSavePoints(evaluator.id)}
                                disabled={isSaving}
                                aria-label="Save points"
                              >
                                Save
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
                            <span className="text-sm text-muted-foreground">{t('editing')}</span>
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
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirm', { name: evaluatorToDelete?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Evaluator Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createTitle')}</DialogTitle>
            <DialogDescription>{t('createDescription', { leagueName })}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('evaluatorType')}</label>
              <Select
                value={createForm.evaluatorTypeId}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, evaluatorTypeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectType')} />
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
              <label className="text-sm font-medium">{t('evaluatorName')}</label>
              <Input
                placeholder={t('nameExample')}
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('pointsLabel')}</label>
              <Input
                type="number"
                min="0"
                placeholder={t('pointsExample')}
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
              Cancel
            </Button>
            <Button onClick={handleCreateEvaluator} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
