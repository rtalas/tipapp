'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createSpecialBetType,
  updateSpecialBetType,
  deleteSpecialBetType,
} from '@/actions/special-bet-types'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { DeleteEntityDialog } from '@/components/admin/common/delete-entity-dialog'
import { SpecialBetTypeTableRow } from './special-bet-type-table-row'
import { CreateSpecialBetTypeDialog } from './create-special-bet-type-dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Sport {
  id: number
  name: string
}

interface SpecialBetSingleType {
  id: number
  name: string
}

interface SpecialBetType {
  id: number
  name: string
  sportId: number
  specialBetSingleTypeId: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  Sport: Sport
  SpecialBetSingleType: SpecialBetSingleType
  _count: {
    LeagueSpecialBetSingle: number
  }
}

interface SpecialBetTypesContentProps {
  specialBetTypes: SpecialBetType[]
  sports: Sport[]
  betTypes: SpecialBetSingleType[]
}

interface EditFormData {
  name: string
  sportId: string
  specialBetSingleTypeId: string
}

interface CreateFormData {
  name: string
  sportId: string
  specialBetSingleTypeId: string
}

export function SpecialBetTypesContent({
  specialBetTypes,
  sports,
  betTypes,
}: SpecialBetTypesContentProps) {
  const t = useTranslations('admin.specialBetTypes')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<SpecialBetType>()
  const createDialog = useCreateDialog<CreateFormData>({
    name: '',
    sportId: '',
    specialBetSingleTypeId: '',
  })

  // Filter special bet types
  const filteredSpecialBetTypes = specialBetTypes.filter((item) => {
    // Sport filter
    if (sportFilter !== 'all' && item.sportId !== parseInt(sportFilter, 10)) {
      return false
    }

    // Type filter
    if (typeFilter !== 'all' && item.specialBetSingleTypeId !== parseInt(typeFilter, 10)) {
      return false
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      return item.name.toLowerCase().includes(searchLower)
    }

    return true
  })

  const handleStartEdit = (item: SpecialBetType) => {
    inlineEdit.startEdit(item.id, {
      name: item.name,
      sportId: item.sportId.toString(),
      specialBetSingleTypeId: item.specialBetSingleTypeId.toString(),
    })
  }

  const handleCancelEdit = () => {
    inlineEdit.cancelEdit()
  }

  const handleSaveEdit = async (itemId: number) => {
    if (!inlineEdit.form) return

    inlineEdit.setSaving(true)
    try {
      await updateSpecialBetType({
        id: itemId,
        name: inlineEdit.form.name,
        sportId: parseInt(inlineEdit.form.sportId, 10),
        specialBetSingleTypeId: parseInt(inlineEdit.form.specialBetSingleTypeId, 10),
      })
      toast.success(t('toast.updated'))
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update special bet type')
      toast.error(message)
      logger.error('Failed to update special bet type', { error, itemId })
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleCreateSpecialBetType = async () => {
    if (!createDialog.form.name || !createDialog.form.sportId || !createDialog.form.specialBetSingleTypeId) {
      toast.error(t('validation.requiredFields'))
      return
    }

    createDialog.startCreating()
    try {
      await createSpecialBetType({
        name: createDialog.form.name,
        sportId: parseInt(createDialog.form.sportId, 10),
        specialBetSingleTypeId: parseInt(createDialog.form.specialBetSingleTypeId, 10),
      })
      toast.success(t('toast.created'))
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create special bet type')
      toast.error(message)
      logger.error('Failed to create special bet type', { error })
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deleteSpecialBetType(deleteDialog.itemToDelete.id)
      toast.success(t('toast.deleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete special bet type')
      toast.error(message)
      logger.error('Failed to delete special bet type', { error, specialBetTypeId: deleteDialog.itemToDelete?.id })
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
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('filters.sport')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allSports')}</SelectItem>
              {sports.map((sport) => (
                <SelectItem key={sport.id} value={sport.id.toString()}>
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('filters.type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
              {betTypes.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={createDialog.openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addButton')}
        </Button>
      </div>

      {/* Special Bet Types Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSpecialBetTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('emptyState')}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.name')}</TableHead>
                    <TableHead>{t('table.sport')}</TableHead>
                    <TableHead>{t('table.type')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSpecialBetTypes.map((item) => (
                    <SpecialBetTypeTableRow
                      key={item.id}
                      item={item}
                      isEditing={inlineEdit.editingId === item.id}
                      editForm={inlineEdit.form}
                      onStartEdit={() => handleStartEdit(item)}
                      onSaveEdit={() => handleSaveEdit(item.id)}
                      onCancelEdit={handleCancelEdit}
                      onDelete={() => deleteDialog.openDialog(item)}
                      onFormChange={inlineEdit.updateForm}
                      isSaving={inlineEdit.isSaving}
                      sports={sports}
                      betTypes={betTypes}
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
        onOpenChange={deleteDialog.setOpen}
        title={t('dialog.deleteTitle')}
        description={deleteDialog.itemToDelete ? t('dialog.deleteConfirm', { name: deleteDialog.itemToDelete.name }) : ''}
        warningMessage={
          deleteDialog.itemToDelete && deleteDialog.itemToDelete._count.LeagueSpecialBetSingle > 0
            ? t('dialog.deleteWarning', { count: deleteDialog.itemToDelete._count.LeagueSpecialBetSingle })
            : undefined
        }
        onConfirm={handleDelete}
        isDeleting={deleteDialog.isDeleting}
      />

      {/* Create Special Bet Type Dialog */}
      <CreateSpecialBetTypeDialog
        open={createDialog.open}
        onOpenChange={createDialog.setOpen}
        formData={createDialog.form}
        onFormChange={createDialog.updateForm}
        onCreate={handleCreateSpecialBetType}
        isCreating={createDialog.isCreating}
        sports={sports}
        betTypes={betTypes}
      />
    </>
  )
}
