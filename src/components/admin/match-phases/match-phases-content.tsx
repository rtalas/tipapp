'use client'

import React, { useState } from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createMatchPhase,
  updateMatchPhase,
  deleteMatchPhase,
} from '@/actions/match-phases'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { DeleteEntityDialog } from '@/components/admin/common/delete-entity-dialog'
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

interface MatchPhase {
  id: number
  name: string
  rank: number
  bestOf: number | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  _count: {
    Match: number
  }
}

interface MatchPhasesContentProps {
  initialPhases: MatchPhase[]
}

interface EditFormData {
  name: string
  rank: string
  bestOf: string
}

interface CreateFormData {
  name: string
  rank: string
  bestOf: string
}

export function MatchPhasesContent({ initialPhases }: MatchPhasesContentProps) {
  const t = useTranslations('admin.matchPhases')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<MatchPhase>()
  const createDialog = useCreateDialog<CreateFormData>({
    name: '',
    rank: '0',
    bestOf: '',
  })

  // Filter match phases
  const filteredPhases = initialPhases.filter((item) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return item.name.toLowerCase().includes(searchLower)
    }
    return true
  })

  const handleStartEdit = (item: MatchPhase) => {
    inlineEdit.startEdit(item.id, {
      name: item.name,
      rank: item.rank.toString(),
      bestOf: item.bestOf?.toString() || '',
    })
  }

  const handleCancelEdit = () => {
    inlineEdit.cancelEdit()
  }

  const handleSaveEdit = async (itemId: number) => {
    if (!inlineEdit.form) return

    const rank = parseInt(inlineEdit.form.rank, 10)
    if (isNaN(rank) || rank < 0) {
      toast.error(t('validation.rankNegative'))
      return
    }

    let bestOf: number | null = null
    if (inlineEdit.form.bestOf) {
      bestOf = parseInt(inlineEdit.form.bestOf, 10)
      if (isNaN(bestOf) || bestOf < 1 || bestOf > 7) {
        toast.error(t('validation.bestOfRange'))
        return
      }
    }

    inlineEdit.setSaving(true)
    try {
      await updateMatchPhase({
        id: itemId,
        name: inlineEdit.form.name,
        rank,
        bestOf,
      })
      toast.success(t('toast.updated'))
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update match phase')
      toast.error(message)
      logger.error('Failed to update match phase', { error, itemId })
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleCreateMatchPhase = async () => {
    if (!createDialog.form.name) {
      toast.error(t('validation.nameRequired'))
      return
    }

    const rank = parseInt(createDialog.form.rank, 10)
    if (isNaN(rank) || rank < 0) {
      toast.error(t('validation.rankNegative'))
      return
    }

    let bestOf: number | null = null
    if (createDialog.form.bestOf) {
      bestOf = parseInt(createDialog.form.bestOf, 10)
      if (isNaN(bestOf) || bestOf < 1 || bestOf > 7) {
        toast.error(t('validation.bestOfRange'))
        return
      }
    }

    createDialog.startCreating()
    try {
      await createMatchPhase({
        name: createDialog.form.name,
        rank,
        bestOf,
      })
      toast.success(t('toast.created'))
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create match phase')
      toast.error(message)
      logger.error('Failed to create match phase', { error })
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deleteMatchPhase(deleteDialog.itemToDelete.id)
      toast.success(t('toast.deleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete match phase')
      toast.error(message)
      logger.error('Failed to delete match phase', { error, phaseId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
  }

  const getBestOfDisplay = (bestOf: number | null) => {
    if (bestOf === null) {
      return t('bestOf.single')
    }
    return t('bestOf.multiple', { count: bestOf })
  }

  return (
    <>
      {/* Header with Create Button and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row">
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={createDialog.openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addButton')}
        </Button>
      </div>

      {/* Match Phases Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPhases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('emptyState')}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.name')}</TableHead>
                    <TableHead>{t('table.rank')}</TableHead>
                    <TableHead>{t('table.bestOf')}</TableHead>
                    <TableHead>{t('table.usage')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPhases.map((item) => (
                    <TableRow key={item.id} className="table-row-hover">
                      <TableCell>
                        {inlineEdit.editingId === item.id && inlineEdit.form ? (
                          <div className="flex items-start gap-2 min-w-max">
                            <div className="flex-1 space-y-2">
                              <Input
                                type="text"
                                value={inlineEdit.form.name}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ name: e.target.value })
                                }
                                placeholder={t('form.namePlaceholder')}
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                autoFocus
                                aria-label={t('form.nameLabel')}
                              />
                              <Input
                                type="number"
                                min="0"
                                value={inlineEdit.form.rank}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ rank: e.target.value })
                                }
                                placeholder={t('form.rankPlaceholder')}
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label={t('form.rankLabel')}
                              />
                              <Select
                                value={inlineEdit.form.bestOf || undefined}
                                onValueChange={(value) =>
                                  inlineEdit.updateForm({ bestOf: value || '' })
                                }
                                disabled={inlineEdit.isSaving}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder={t('bestOf.single')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">{t('bestOf.option1')}</SelectItem>
                                  <SelectItem value="3">{t('bestOf.option3')}</SelectItem>
                                  <SelectItem value="5">{t('bestOf.option5')}</SelectItem>
                                  <SelectItem value="7">{t('bestOf.option7')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2 mt-8">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                aria-label={t('form.cancelLabel')}
                              >
                                {tCommon('button.cancel')}
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveEdit(item.id)}
                                disabled={inlineEdit.isSaving}
                                aria-label={t('form.saveLabel')}
                              >
                                {tCommon('button.save')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="font-medium">{item.name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.rank}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getBestOfDisplay(item.bestOf)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {t('usage', { count: item._count.Match })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(item)}
                            aria-label={`Edit match phase: ${item.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDialog.openDialog(item)}
                            aria-label={`Delete match phase: ${item.name}`}
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
      <DeleteEntityDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.setOpen}
        title={t('dialog.deleteTitle')}
        description={deleteDialog.itemToDelete ? t('dialog.deleteConfirm', { name: deleteDialog.itemToDelete.name }) : ''}
        warningMessage={
          deleteDialog.itemToDelete && deleteDialog.itemToDelete._count.Match > 0
            ? t('dialog.deleteWarning', { count: deleteDialog.itemToDelete._count.Match })
            : undefined
        }
        onConfirm={handleDelete}
        isDeleting={deleteDialog.isDeleting}
      />

      {/* Create Match Phase Dialog */}
      <Dialog open={createDialog.open} onOpenChange={createDialog.setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dialog.createTitle')}</DialogTitle>
            <DialogDescription>{t('dialog.createDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('form.nameLabel')}</label>
              <Input
                placeholder={t('form.namePlaceholder')}
                value={createDialog.form.name}
                onChange={(e) =>
                  createDialog.updateForm({ name: e.target.value })
                }
                aria-label={t('form.nameLabel')}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('form.rankLabel')}</label>
              <Input
                type="number"
                min="0"
                placeholder={t('form.rankPlaceholder')}
                value={createDialog.form.rank}
                onChange={(e) =>
                  createDialog.updateForm({ rank: e.target.value })
                }
                aria-label={t('form.rankLabel')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('form.rankHint')}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">{t('form.bestOfLabel')}</label>
              <Select
                value={createDialog.form.bestOf || undefined}
                onValueChange={(value) =>
                  createDialog.updateForm({ bestOf: value || '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('bestOf.single')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('bestOf.option1')}</SelectItem>
                  <SelectItem value="3">{t('bestOf.option3')}</SelectItem>
                  <SelectItem value="5">{t('bestOf.option5')}</SelectItem>
                  <SelectItem value="7">{t('bestOf.option7')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('form.bestOfHint')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={createDialog.closeDialog}
              disabled={createDialog.isCreating}
            >
              {tCommon('button.cancel')}
            </Button>
            <Button onClick={handleCreateMatchPhase} disabled={createDialog.isCreating}>
              {createDialog.isCreating ? t('dialog.creating') : t('dialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
