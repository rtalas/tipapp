'use client'

import React, { useState } from 'react'
import { Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createTeam,
  updateTeam,
  deleteTeam,
} from '@/actions/teams'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { validateTeamCreate, validateTeamEdit } from '@/lib/validation-client'
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

interface Team {
  id: number
  name: string
  nickname: string | null
  shortcut: string
  flagIcon: string | null
  flagType: string | null
  sportId: number
  externalId: number | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  Sport: Sport
  _count: {
    LeagueTeam: number
  }
}

interface TeamsContentProps {
  teams: Team[]
  sports: Sport[]
  league?: { id: number; name: string }
}

interface EditFormData {
  name: string
  nickname: string
  shortcut: string
  sportId: string
  flagIcon: string
  flagType: string
}

interface CreateFormData {
  sportId: string
  name: string
  nickname: string
  shortcut: string
  flagIcon: string
  flagType: string
  externalId: string
}

export function TeamsContent({ teams, sports }: TeamsContentProps) {
  const t = useTranslations('admin.teams')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')
  const [sportFilter, setSportFilter] = useState<string>('all')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<Team>()
  const createDialog = useCreateDialog<CreateFormData>({
    sportId: '',
    name: '',
    nickname: '',
    shortcut: '',
    flagIcon: '',
    flagType: 'none',
    externalId: '',
  })

  // Filter teams with optimized string search
  const filteredTeams = teams.filter((team) => {
    // Sport filter
    if (sportFilter !== 'all' && team.sportId !== parseInt(sportFilter, 10)) {
      return false
    }

    // Search filter - optimized: combine searchable fields into single string
    if (search) {
      const searchLower = search.toLowerCase()
      const searchableText = `${team.name} ${team.shortcut} ${team.nickname || ''}`.toLowerCase()
      return searchableText.includes(searchLower)
    }

    return true
  })

  const handleStartEdit = (team: Team) => {
    inlineEdit.startEdit(team.id, {
      name: team.name,
      nickname: team.nickname || '',
      shortcut: team.shortcut,
      sportId: team.sportId.toString(),
      flagIcon: team.flagIcon || '',
      flagType: team.flagType || 'none',
    })
  }

  const handleCancelEdit = () => {
    inlineEdit.cancelEdit()
  }

  const handleSaveEdit = async (teamId: number) => {
    if (!inlineEdit.form) return

    // Convert "none" to undefined for flagType
    const flagType = inlineEdit.form.flagType === 'none' ? undefined : inlineEdit.form.flagType

    // Validate form data
    const validation = validateTeamEdit({
      id: teamId,
      name: inlineEdit.form.name,
      nickname: inlineEdit.form.nickname,
      shortcut: inlineEdit.form.shortcut,
      sportId: parseInt(inlineEdit.form.sportId, 10),
      flagIcon: inlineEdit.form.flagIcon,
      flagType: flagType || undefined,
    })

    if (!validation.success) {
      const message = getErrorMessage(validation.error, t('validationFailed'))
      toast.error(message)
      return
    }

    inlineEdit.setSaving(true)
    try {
      await updateTeam({
        id: teamId,
        name: inlineEdit.form.name,
        nickname: inlineEdit.form.nickname || undefined,
        shortcut: inlineEdit.form.shortcut,
        sportId: parseInt(inlineEdit.form.sportId, 10),
        flagIcon: inlineEdit.form.flagIcon || undefined,
        flagType: (flagType as 'icon' | 'path') || undefined,
      })
      toast.success(t('teamUpdated'))
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, t('teamUpdateFailed'))
      toast.error(message)
      logger.error('Failed to update team', { error, teamId })
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleCreateTeam = async () => {
    // Convert "none" to undefined for flagType
    const flagType = createDialog.form.flagType === 'none' ? undefined : createDialog.form.flagType

    // Validate form data
    const validation = validateTeamCreate({
      sportId: parseInt(createDialog.form.sportId, 10) || undefined,
      name: createDialog.form.name,
      nickname: createDialog.form.nickname,
      shortcut: createDialog.form.shortcut,
      flagIcon: createDialog.form.flagIcon,
      flagType: flagType || undefined,
      externalId: createDialog.form.externalId ? parseInt(createDialog.form.externalId, 10) : undefined,
    })

    if (!validation.success) {
      const message = getErrorMessage(validation.error, t('validationFailed'))
      toast.error(message)
      return
    }

    createDialog.startCreating()
    try {
      await createTeam({
        sportId: parseInt(createDialog.form.sportId, 10),
        name: createDialog.form.name,
        nickname: createDialog.form.nickname || undefined,
        shortcut: createDialog.form.shortcut,
        flagIcon: createDialog.form.flagIcon || undefined,
        flagType: (flagType as 'icon' | 'path') || undefined,
        externalId: createDialog.form.externalId ? parseInt(createDialog.form.externalId, 10) : undefined,
      })
      toast.success(t('teamCreated'))
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, t('teamCreateFailed'))
      toast.error(message)
      logger.error('Failed to create team', { error })
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deleteTeam(deleteDialog.itemToDelete.id)
      toast.success(t('teamDeleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, t('teamDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete team', { error, teamId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
  }

  return (
    <>
      {/* Header with Create Button and Filters */}
      <ContentFilterHeader
        searchPlaceholder={t('searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            name: 'sport',
            value: sportFilter,
            onChange: setSportFilter,
            placeholder: t('sport'),
            options: [
              { value: 'all', label: t('allSports') },
              ...sports.map((sport) => ({
                value: sport.id.toString(),
                label: sport.name,
              })),
            ],
          },
        ]}
        createButtonLabel={t('addTeam')}
        onCreateClick={createDialog.openDialog}
      />

      {/* Teams Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('noTeamsFound')}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCommon('name')}</TableHead>
                    <TableHead>{t('shortcut')}</TableHead>
                    <TableHead>{t('sport')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => (
                    <TableRow key={team.id} className="table-row-hover">
                      <TableCell>
                        {inlineEdit.editingId === team.id && inlineEdit.form ? (
                          <div className="flex items-start gap-2 min-w-max">
                            <div className="flex-1 space-y-2">
                              <Input
                                type="text"
                                value={inlineEdit.form.name}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ name: e.target.value })
                                }
                                placeholder={t('teamName')}
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                autoFocus
                                aria-label={t('teamName')}
                              />
                              <Input
                                type="text"
                                value={inlineEdit.form.nickname}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ nickname: e.target.value })
                                }
                                placeholder={t('nicknameOptional')}
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label={t('nickname')}
                              />
                              <Input
                                type="text"
                                value={inlineEdit.form.shortcut}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ shortcut: e.target.value })
                                }
                                placeholder={t('shortcut')}
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label={t('teamShortcut')}
                              />
                              <Select
                                value={inlineEdit.form.sportId}
                                onValueChange={(value) =>
                                  inlineEdit.updateForm({ sportId: value })
                                }
                              >
                                <SelectTrigger className="h-8" aria-label={t('teamSport')}>
                                  <SelectValue placeholder={t('selectSport')} />
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
                                value={inlineEdit.form.flagType}
                                onValueChange={(value) =>
                                  inlineEdit.updateForm({ flagType: value })
                                }
                              >
                                <SelectTrigger className="h-8" aria-label={t('flagType')}>
                                  <SelectValue placeholder={t('selectFlagType')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">{t('flagTypeNone')}</SelectItem>
                                  <SelectItem value="icon">{t('flagTypeIcon')}</SelectItem>
                                  <SelectItem value="path">{t('flagTypePath')}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="text"
                                value={inlineEdit.form.flagIcon}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ flagIcon: e.target.value })
                                }
                                placeholder={inlineEdit.form.flagType === 'path' ? t('flagIconPathPlaceholder') : t('flagIconPlaceholder')}
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label={t('flagIconPath')}
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-8">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                aria-label={t('cancelEditing')}
                              >
                                {tCommon('cancel')}
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveEdit(team.id)}
                                disabled={inlineEdit.isSaving}
                                aria-label={t('saveChanges')}
                              >
                                {tCommon('save')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{team.name}</div>
                            {team.nickname && (
                              <div className="text-sm text-muted-foreground">{team.nickname}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground">{team.shortcut}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{team.Sport.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(team)}
                            aria-label={t('editTeam', { name: team.name })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDialog.openDialog(team)}
                            aria-label={t('deleteTeam', { name: team.name })}
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

      {/* Create Team Dialog */}
      <Dialog open={createDialog.open} onOpenChange={createDialog.setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createTitle')}</DialogTitle>
            <DialogDescription>{t('createDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('sport')}</label>
              <Select
                value={createDialog.form.sportId}
                onValueChange={(value) =>
                  createDialog.updateForm({ sportId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectSport')} />
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
              <label className="text-sm font-medium">{tCommon('name')}</label>
              <Input
                placeholder={t('nameExample')}
                value={createDialog.form.name}
                onChange={(e) =>
                  createDialog.updateForm({ name: e.target.value })
                }
                aria-label={t('teamName')}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('nickname')}</label>
              <Input
                placeholder={t('nicknameExample')}
                value={createDialog.form.nickname}
                onChange={(e) =>
                  createDialog.updateForm({ nickname: e.target.value })
                }
                aria-label={t('nickname')}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('shortcut')}</label>
              <Input
                placeholder={t('shortcutExample')}
                value={createDialog.form.shortcut}
                onChange={(e) =>
                  createDialog.updateForm({ shortcut: e.target.value })
                }
                aria-label={t('teamShortcut')}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t('flagType')}</label>
              <Select
                value={createDialog.form.flagType}
                onValueChange={(value) =>
                  createDialog.updateForm({ flagType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectFlagType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('flagTypeNone')}</SelectItem>
                  <SelectItem value="icon">{t('flagTypeIconNational')}</SelectItem>
                  <SelectItem value="path">{t('flagTypePathLogo')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('chooseFlagType')}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">{t('flagIconPath')}</label>
              <Input
                placeholder={createDialog.form.flagType === 'path' ? t('flagIconPathPlaceholder') : t('flagIconPlaceholder')}
                value={createDialog.form.flagIcon}
                onChange={(e) =>
                  createDialog.updateForm({ flagIcon: e.target.value })
                }
                aria-label={t('flagIconPath')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {createDialog.form.flagType === 'path'
                  ? t('flagPathHelp')
                  : t('flagIconHelp')}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">{t('externalId')}</label>
              <Input
                type="number"
                placeholder={t('externalIdOptional')}
                value={createDialog.form.externalId}
                onChange={(e) =>
                  createDialog.updateForm({ externalId: e.target.value })
                }
                aria-label={t('externalId')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={createDialog.closeDialog}
              disabled={createDialog.isCreating}
            >
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleCreateTeam} disabled={createDialog.isCreating}>
              {createDialog.isCreating ? t('creating') : tCommon('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
