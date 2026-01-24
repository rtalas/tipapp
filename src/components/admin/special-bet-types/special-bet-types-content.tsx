'use client'

import * as React from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
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
  const [search, setSearch] = React.useState('')
  const [sportFilter, setSportFilter] = React.useState<string>('all')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')

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
                              <Select
                                value={inlineEdit.form.sportId}
                                onValueChange={(value) =>
                                  inlineEdit.updateForm({ sportId: value })
                                }
                              >
                                <SelectTrigger className="h-8" aria-label={t('form.sportLabel')}>
                                  <SelectValue placeholder={t('form.selectSport')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {sports.map((sport) => (
                                    <SelectItem key={sport.id} value={sport.id.toString()}>
                                      {sport.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={inlineEdit.form.specialBetSingleTypeId}
                                onValueChange={(value) =>
                                  inlineEdit.updateForm({ specialBetSingleTypeId: value })
                                }
                              >
                                <SelectTrigger className="h-8" aria-label={t('form.typeLabel')}>
                                  <SelectValue placeholder={t('form.selectType')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {betTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id.toString()}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
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
                        <Badge variant="secondary">{item.Sport.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.SpecialBetSingleType.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(item)}
                            aria-label={`Edit special bet type: ${item.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDialog.openDialog(item)}
                            aria-label={`Delete special bet type: ${item.name}`}
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
                  {deleteDialog.itemToDelete._count.LeagueSpecialBetSingle > 0 && (
                    <div className="mt-2 text-sm font-semibold text-amber-600">
                      {t('dialog.deleteWarning', { count: deleteDialog.itemToDelete._count.LeagueSpecialBetSingle })}
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

      {/* Create Special Bet Type Dialog */}
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
              <label className="text-sm font-medium">{t('form.sportLabel')}</label>
              <Select
                value={createDialog.form.sportId}
                onValueChange={(value) =>
                  createDialog.updateForm({ sportId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectSport')} />
                </SelectTrigger>
                <SelectContent>
                  {sports.map((sport) => (
                    <SelectItem key={sport.id} value={sport.id.toString()}>
                      {sport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">{t('form.typeLabel')}</label>
              <Select
                value={createDialog.form.specialBetSingleTypeId}
                onValueChange={(value) =>
                  createDialog.updateForm({ specialBetSingleTypeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {betTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('form.typeHint')}
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
            <Button onClick={handleCreateSpecialBetType} disabled={createDialog.isCreating}>
              {createDialog.isCreating ? t('dialog.creating') : t('dialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
