'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createTeam,
  updateTeam,
  deleteTeam,
} from '@/actions/teams'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { validate } from '@/lib/validation-client'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { ContentFilterHeader } from '@/components/admin/common/content-filter-header'
import { DeleteEntityDialog } from '@/components/admin/common/delete-entity-dialog'
import { TeamTableRow } from './team-table-row'
import { CreateTeamDialog } from './create-team-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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

  const handleSaveEdit = async (teamId: number) => {
    if (!inlineEdit.form) return

    // Convert "none" to undefined for flagType
    const flagType = inlineEdit.form.flagType === 'none' ? undefined : inlineEdit.form.flagType

    // Validate form data
    const validation = validate.teamEdit({
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
      const result = await updateTeam({
        id: teamId,
        name: inlineEdit.form.name,
        nickname: inlineEdit.form.nickname || undefined,
        shortcut: inlineEdit.form.shortcut,
        sportId: parseInt(inlineEdit.form.sportId, 10),
        flagIcon: inlineEdit.form.flagIcon || undefined,
        flagType: (flagType as 'icon' | 'path') || undefined,
      })
      if (!result.success) {
        toast.error('error' in result ? result.error : t('teamUpdateFailed'))
        return
      }
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
    const validation = validate.teamCreate({
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
      const result = await createTeam({
        sportId: parseInt(createDialog.form.sportId, 10),
        name: createDialog.form.name,
        nickname: createDialog.form.nickname || undefined,
        shortcut: createDialog.form.shortcut,
        flagIcon: createDialog.form.flagIcon || undefined,
        flagType: (flagType as 'icon' | 'path') || undefined,
        externalId: createDialog.form.externalId ? parseInt(createDialog.form.externalId, 10) : undefined,
      })
      if (!result.success) {
        toast.error('error' in result ? result.error : t('teamCreateFailed'))
        createDialog.cancelCreating()
        return
      }
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
      const result = await deleteTeam(deleteDialog.itemToDelete.id)
      if (!result.success) {
        toast.error('error' in result ? result.error : t('teamDeleteFailed'))
        deleteDialog.cancelDeleting()
        return
      }
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
                    <TeamTableRow
                      key={team.id}
                      team={team}
                      isEditing={inlineEdit.editingId === team.id}
                      editForm={inlineEdit.form}
                      onStartEdit={() => handleStartEdit(team)}
                      onSaveEdit={() => handleSaveEdit(team.id)}
                      onCancelEdit={inlineEdit.cancelEdit}
                      onDelete={() => deleteDialog.openDialog(team)}
                      onFormChange={inlineEdit.updateForm}
                      isSaving={inlineEdit.isSaving}
                      sports={sports}
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
      <CreateTeamDialog
        open={createDialog.open}
        onOpenChange={createDialog.onOpenChange}
        formData={createDialog.form}
        onFormChange={createDialog.updateForm}
        onCreate={handleCreateTeam}
        isCreating={createDialog.isCreating}
        sports={sports}
      />
    </>
  )
}
