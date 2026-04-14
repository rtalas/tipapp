'use client'

import React, { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { createTournament, updateTournament, deleteTournament } from '@/actions/tournaments'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { ContentFilterHeader } from '@/components/admin/common/content-filter-header'
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
import { Label } from '@/components/ui/label'

interface Tournament {
  id: number
  name: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  _count: {
    LeagueTeam: number
  }
}

interface TournamentsContentProps {
  tournaments: Tournament[]
}

interface EditFormData {
  name: string
}

interface CreateFormData {
  name: string
}

export function TournamentsContent({ tournaments }: TournamentsContentProps) {
  const t = useTranslations('admin.tournaments')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<Tournament>()
  const createDialog = useCreateDialog<CreateFormData>({ name: '' })

  const filteredTournaments = tournaments.filter((tournament) => {
    if (!search) return true
    return tournament.name.toLowerCase().includes(search.toLowerCase())
  })

  const handleStartEdit = (tournament: Tournament) => {
    inlineEdit.startEdit(tournament.id, { name: tournament.name })
  }

  const handleSaveEdit = async (tournamentId: number) => {
    if (!inlineEdit.form) return

    inlineEdit.setSaving(true)
    try {
      const result = await updateTournament({ id: tournamentId, name: inlineEdit.form.name })
      if (!result.success) {
        toast.error('error' in result ? result.error : t('updateFailed'))
        return
      }
      toast.success(t('updated'))
      inlineEdit.finishEdit()
    } catch (error) {
      toast.error(getErrorMessage(error, t('updateFailed')))
      logger.error('Failed to update tournament', { error, tournamentId })
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleCreate = async () => {
    createDialog.startCreating()
    try {
      const result = await createTournament({ name: createDialog.form.name })
      if (!result.success) {
        toast.error('error' in result ? result.error : t('createFailed'))
        createDialog.cancelCreating()
        return
      }
      toast.success(t('created'))
      createDialog.finishCreating()
    } catch (error) {
      toast.error(getErrorMessage(error, t('createFailed')))
      logger.error('Failed to create tournament', { error })
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      const result = await deleteTournament(deleteDialog.itemToDelete.id)
      if (!result.success) {
        toast.error('error' in result ? result.error : t('deleteFailed'))
        deleteDialog.cancelDeleting()
        return
      }
      toast.success(t('deleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      toast.error(getErrorMessage(error, t('deleteFailed')))
      logger.error('Failed to delete tournament', { error, tournamentId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
  }

  return (
    <>
      <ContentFilterHeader
        searchPlaceholder={t('searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        createButtonLabel={t('addTournament')}
        onCreateClick={createDialog.openDialog}
      />

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTournaments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('noTournamentsFound')}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCommon('name')}</TableHead>
                    <TableHead>{t('teamsColumn')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTournaments.map((tournament) => {
                    const isEditing = inlineEdit.editingId === tournament.id
                    return (
                      <TableRow key={tournament.id}>
                        <TableCell>
                          {isEditing && inlineEdit.form ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={inlineEdit.form.name}
                                onChange={(e) => inlineEdit.updateForm({ name: e.target.value })}
                                className="h-8 w-48"
                                disabled={inlineEdit.isSaving}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(tournament.id)
                                  if (e.key === 'Escape') inlineEdit.cancelEdit()
                                }}
                              />
                              <Button size="sm" onClick={() => handleSaveEdit(tournament.id)} disabled={inlineEdit.isSaving}>
                                {tCommon('button.save')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={inlineEdit.cancelEdit}>
                                {tCommon('button.cancel')}
                              </Button>
                            </div>
                          ) : (
                            <span className="font-medium">{tournament.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{tournament._count.LeagueTeam}</Badge>
                        </TableCell>
                        <TableCell>
                          {!isEditing && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleStartEdit(tournament)}
                                aria-label={tCommon('edit')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteDialog.openDialog(tournament)}
                                className="text-destructive hover:text-destructive"
                                aria-label={tCommon('delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
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

      <DeleteEntityDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        title={t('deleteTitle')}
        description={deleteDialog.itemToDelete ? t('deleteConfirm', { name: deleteDialog.itemToDelete.name }) : ''}
        warningMessage={
          deleteDialog.itemToDelete && deleteDialog.itemToDelete._count.LeagueTeam > 0
            ? t('deleteWarning', { count: deleteDialog.itemToDelete._count.LeagueTeam })
            : undefined
        }
        onConfirm={handleDelete}
        isDeleting={deleteDialog.isDeleting}
      />

      <Dialog open={createDialog.open} onOpenChange={createDialog.onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('createTitle')}</DialogTitle>
            <DialogDescription>{t('createDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tournament-name">{tCommon('name')}</Label>
              <Input
                id="tournament-name"
                value={createDialog.form.name}
                onChange={(e) => createDialog.updateForm({ name: e.target.value })}
                placeholder={t('namePlaceholder')}
                disabled={createDialog.isCreating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && createDialog.form.name.trim()) handleCreate()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => createDialog.onOpenChange(false)} disabled={createDialog.isCreating}>
              {tCommon('button.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={createDialog.isCreating || !createDialog.form.name.trim()}>
              {createDialog.isCreating ? t('creating') : t('addTournament')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
