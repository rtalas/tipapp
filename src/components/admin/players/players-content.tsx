'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
} from '@/actions/players'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { validatePlayerCreate, validatePlayerEdit } from '@/lib/validation-client'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { DeleteEntityDialog } from '@/components/admin/common/delete-entity-dialog'
import { PlayerTableRow } from './player-table-row'
import { CreatePlayerDialog } from './create-player-dialog'
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

interface Player {
  id: number
  firstName: string | null
  lastName: string | null
  isActive: boolean
  position: string | null
  externalId: number | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  _count: {
    LeaguePlayer: number
  }
}

interface League {
  id: number
  name: string
}

interface PlayersContentProps {
  players: Player[]
  league?: League
}

interface EditFormData {
  firstName: string
  lastName: string
  position: string
}

interface CreateFormData {
  firstName: string
  lastName: string
  position: string
  isActive: boolean
  externalId: string
}

export function PlayersContent({ players }: PlayersContentProps) {
  const t = useTranslations('admin.players')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<Player>()
  const createDialog = useCreateDialog<CreateFormData>({
    firstName: '',
    lastName: '',
    position: '',
    isActive: true,
    externalId: '',
  })

  // Filter players with optimized string search
  const filteredPlayers = players.filter((player) => {
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && !player.isActive) return false
      if (statusFilter === 'inactive' && player.isActive) return false
    }

    // Search filter - optimized: combine searchable fields
    if (search) {
      const searchLower = search.toLowerCase()
      const fullName = `${player.firstName || ''} ${player.lastName || ''}`.toLowerCase()
      return fullName.includes(searchLower)
    }

    return true
  })

  const getPlayerName = (player: Player) => {
    return `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${player.id}`
  }

  const handleStartEdit = (player: Player) => {
    inlineEdit.startEdit(player.id, {
      firstName: player.firstName || '',
      lastName: player.lastName || '',
      position: player.position || '',
    })
  }

  const handleSaveEdit = async (playerId: number) => {
    if (!inlineEdit.form) return

    // Validate form data
    const validation = validatePlayerEdit({
      id: playerId,
      firstName: inlineEdit.form.firstName,
      lastName: inlineEdit.form.lastName,
      position: inlineEdit.form.position,
    })

    if (!validation.success) {
      const message = getErrorMessage(validation.error, t('validationFailed'))
      toast.error(message)
      return
    }

    inlineEdit.setSaving(true)
    try {
      await updatePlayer({
        id: playerId,
        firstName: inlineEdit.form.firstName || undefined,
        lastName: inlineEdit.form.lastName || undefined,
        position: inlineEdit.form.position || undefined,
      })
      toast.success(t('playerUpdated'))
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, t('playerUpdateFailed'))
      toast.error(message)
      logger.error('Failed to update player', { error, playerId })
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleToggleActive = async (player: Player) => {
    try {
      await updatePlayer({
        id: player.id,
        isActive: !player.isActive,
      })
      toast.success(`Player marked as ${!player.isActive ? 'active' : 'inactive'}`)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update player')
      }
      logger.error('Failed to toggle player active status', { error, playerId: player.id })
    }
  }

  const handleCreatePlayer = async () => {
    // Validate form data
    const validation = validatePlayerCreate({
      firstName: createDialog.form.firstName,
      lastName: createDialog.form.lastName,
      position: createDialog.form.position,
      isActive: createDialog.form.isActive,
      externalId: createDialog.form.externalId ? parseInt(createDialog.form.externalId, 10) : undefined,
    })

    if (!validation.success) {
      const message = getErrorMessage(validation.error, t('validationFailed'))
      toast.error(message)
      return
    }

    createDialog.startCreating()
    try {
      await createPlayer({
        firstName: createDialog.form.firstName || undefined,
        lastName: createDialog.form.lastName || undefined,
        position: createDialog.form.position || undefined,
        isActive: createDialog.form.isActive,
        externalId: createDialog.form.externalId ? parseInt(createDialog.form.externalId, 10) : undefined,
      })
      toast.success(t('playerCreated'))
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, t('playerCreateFailed'))
      toast.error(message)
      logger.error('Failed to create player', { error })
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deletePlayer(deleteDialog.itemToDelete.id)
      toast.success(t('playerDeleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, t('playerDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete player', { error, playerId: deleteDialog.itemToDelete?.id })
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={tCommon('status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allPlayers')}</SelectItem>
              <SelectItem value="active">{t('active')}</SelectItem>
              <SelectItem value="inactive">{t('inactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={createDialog.openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addPlayer')}
        </Button>
      </div>

      {/* Players Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('noPlayersFound')}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCommon('name')}</TableHead>
                    <TableHead>{t('position')}</TableHead>
                    <TableHead>{tCommon('status')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <PlayerTableRow
                      key={player.id}
                      player={player}
                      isEditing={inlineEdit.editingId === player.id}
                      editForm={inlineEdit.form}
                      onStartEdit={() => handleStartEdit(player)}
                      onSaveEdit={() => handleSaveEdit(player.id)}
                      onCancelEdit={inlineEdit.cancelEdit}
                      onDelete={() => deleteDialog.openDialog(player)}
                      onToggleActive={() => handleToggleActive(player)}
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
        onOpenChange={deleteDialog.setOpen}
        title={t('deleteTitle')}
        description={deleteDialog.itemToDelete ? t('deleteConfirm', { name: getPlayerName(deleteDialog.itemToDelete) }) : ''}
        onConfirm={handleDelete}
        isDeleting={deleteDialog.isDeleting}
      />

      {/* Create Player Dialog */}
      <CreatePlayerDialog
        open={createDialog.open}
        onOpenChange={createDialog.setOpen}
        formData={createDialog.form}
        onFormChange={createDialog.updateForm}
        onCreate={handleCreatePlayer}
        isCreating={createDialog.isCreating}
      />
    </>
  )
}
