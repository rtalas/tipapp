'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createMatchPhase,
  updateMatchPhase,
  deleteMatchPhase,
} from '@/actions/match-phases'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { DeleteEntityDialog } from '@/components/admin/common/delete-entity-dialog'
import { MatchPhaseTableRow } from './match-phase-table-row'
import { CreateMatchPhaseDialog } from './create-match-phase-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
                    <MatchPhaseTableRow
                      key={item.id}
                      matchPhase={item}
                      isEditing={inlineEdit.editingId === item.id}
                      editForm={inlineEdit.form}
                      onStartEdit={() => handleStartEdit(item)}
                      onSaveEdit={() => handleSaveEdit(item.id)}
                      onCancelEdit={inlineEdit.cancelEdit}
                      onDelete={() => deleteDialog.openDialog(item)}
                      onFormChange={inlineEdit.updateForm}
                      isSaving={inlineEdit.isSaving}
                    />
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
        onOpenChange={deleteDialog.onOpenChange}
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
      <CreateMatchPhaseDialog
        open={createDialog.open}
        onOpenChange={createDialog.onOpenChange}
        formData={createDialog.form}
        onFormChange={createDialog.updateForm}
        onCreate={handleCreateMatchPhase}
        isCreating={createDialog.isCreating}
      />
    </>
  )
}
