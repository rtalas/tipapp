'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createSeriesType,
  updateSeriesType,
  deleteSeriesType,
} from '@/actions/series-types'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
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

interface SeriesType {
  id: number
  name: string
  bestOf: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  _count: {
    LeagueSpecialBetSerie: number
  }
}

interface SeriesTypesContentProps {
  seriesTypes: SeriesType[]
}

interface EditFormData {
  name: string
  bestOf: string
}

interface CreateFormData {
  name: string
  bestOf: string
}

export function SeriesTypesContent({ seriesTypes }: SeriesTypesContentProps) {
  const t = useTranslations('admin.seriesTypes')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<SeriesType>()
  const createDialog = useCreateDialog<CreateFormData>({
    name: '',
    bestOf: '',
  })

  // Filter series types
  const filteredSeriesTypes = seriesTypes.filter((item) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return item.name.toLowerCase().includes(searchLower)
    }
    return true
  })

  const handleStartEdit = (item: SeriesType) => {
    inlineEdit.startEdit(item.id, {
      name: item.name,
      bestOf: item.bestOf.toString(),
    })
  }

  const handleCancelEdit = () => {
    inlineEdit.cancelEdit()
  }

  const handleSaveEdit = async (itemId: number) => {
    if (!inlineEdit.form) return

    const bestOf = parseInt(inlineEdit.form.bestOf, 10)
    if (isNaN(bestOf) || bestOf < 1 || bestOf > 7) {
      toast.error(t('validation.bestOfRange'))
      return
    }

    inlineEdit.setSaving(true)
    try {
      await updateSeriesType({
        id: itemId,
        name: inlineEdit.form.name,
        bestOf,
      })
      toast.success(t('toast.updated'))
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update series type')
      toast.error(message)
      logger.error('Failed to update series type', { error, itemId })
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleCreateSeriesType = async () => {
    if (!createDialog.form.name || !createDialog.form.bestOf) {
      toast.error(t('validation.requiredFields'))
      return
    }

    const bestOf = parseInt(createDialog.form.bestOf, 10)
    if (isNaN(bestOf) || bestOf < 1 || bestOf > 7) {
      toast.error(t('validation.bestOfRange'))
      return
    }

    createDialog.startCreating()
    try {
      await createSeriesType({
        name: createDialog.form.name,
        bestOf,
      })
      toast.success(t('toast.created'))
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create series type')
      toast.error(message)
      logger.error('Failed to create series type', { error })
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deleteSeriesType(deleteDialog.itemToDelete.id)
      toast.success(t('toast.deleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete series type')
      toast.error(message)
      logger.error('Failed to delete series type', { error, seriesTypeId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
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

      {/* Series Types Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSeriesTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('emptyState')}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.name')}</TableHead>
                    <TableHead>{t('table.bestOf')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeriesTypes.map((item) => (
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
                                min="1"
                                max="7"
                                value={inlineEdit.form.bestOf}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ bestOf: e.target.value })
                                }
                                placeholder={t('form.bestOfPlaceholder')}
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label={t('form.bestOfLabel')}
                              />
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
                        <Badge variant="secondary">{t('bestOf', { count: item.bestOf })}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(item)}
                            aria-label={`Edit series type: ${item.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDialog.openDialog(item)}
                            aria-label={`Delete series type: ${item.name}`}
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
      <Dialog open={deleteDialog.open} onOpenChange={deleteDialog.setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {deleteDialog.itemToDelete && (
                <>
                  {t('dialog.deleteConfirm', { name: deleteDialog.itemToDelete.name })}
                  {deleteDialog.itemToDelete._count.LeagueSpecialBetSerie > 0 && (
                    <div className="mt-2 text-sm font-semibold text-amber-600">
                      {t('dialog.deleteWarning', { count: deleteDialog.itemToDelete._count.LeagueSpecialBetSerie })}
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={deleteDialog.closeDialog}>
              {tCommon('button.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDialog.isDeleting}>
              {deleteDialog.isDeleting ? t('dialog.deleting') : t('dialog.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Series Type Dialog */}
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
              <label className="text-sm font-medium">{t('form.bestOfLabel')}</label>
              <Input
                type="number"
                min="1"
                max="7"
                placeholder={t('form.bestOfPlaceholder')}
                value={createDialog.form.bestOf}
                onChange={(e) =>
                  createDialog.updateForm({ bestOf: e.target.value })
                }
                aria-label={t('form.bestOfLabel')}
              />
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
            <Button onClick={handleCreateSeriesType} disabled={createDialog.isCreating}>
              {createDialog.isCreating ? t('dialog.creating') : t('dialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
