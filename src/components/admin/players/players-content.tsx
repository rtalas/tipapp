'use client'

import * as React from 'react'
import { Trash2, Edit, Plus, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  createPlayer,
  updatePlayer,
  deletePlayer,
} from '@/actions/players'
import { getErrorMessage } from '@/lib/error-handler'
import { validatePlayerCreate, validatePlayerEdit } from '@/lib/validation-client'
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
import { Switch } from '@/components/ui/switch'

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

export function PlayersContent({ players, league }: PlayersContentProps) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')

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

  const handleCancelEdit = () => {
    inlineEdit.cancelEdit()
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
      const message = getErrorMessage(validation.error, 'Validation failed')
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
      toast.success('Player updated')
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update player')
      toast.error(message)
      console.error(error)
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
      console.error(error)
    }
  }

  const handleCreatePlayer = async () => {
    // Validate form data
    const validation = validatePlayerCreate({
      firstName: createDialog.form.firstName,
      lastName: createDialog.form.lastName,
      position: createDialog.form.position,
      isActive: createDialog.form.isActive,
      externalId: createDialog.form.externalId,
    })

    if (!validation.success) {
      const message = getErrorMessage(validation.error, 'Validation failed')
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
      toast.success('Player created')
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create player')
      toast.error(message)
      console.error(error)
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deletePlayer(deleteDialog.itemToDelete.id)
      toast.success('Player deleted')
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete player')
      toast.error(message)
      console.error(error)
      deleteDialog.cancelDeleting()
    }
  }

  return (
    <>
      {/* Header with Create Button and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row">
          <Input
            placeholder="Search by player name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={createDialog.openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Player
        </Button>
      </div>

      {/* Players Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Players</CardTitle>
          <CardDescription>Manage players across all leagues</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No players found</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id} className="table-row-hover">
                      <TableCell>
                        {inlineEdit.editingId === player.id && inlineEdit.form ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-2">
                              <Input
                                type="text"
                                value={inlineEdit.form.firstName}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ firstName: e.target.value })
                                }
                                placeholder="First name"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                autoFocus
                                aria-label="First name"
                              />
                              <Input
                                type="text"
                                value={inlineEdit.form.lastName}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ lastName: e.target.value })
                                }
                                placeholder="Last name"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label="Last name"
                              />
                              <Input
                                type="text"
                                value={inlineEdit.form.position}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ position: e.target.value })
                                }
                                placeholder="Position (optional)"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label="Position"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                aria-label="Cancel editing player"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveEdit(player.id)}
                                disabled={inlineEdit.isSaving}
                                aria-label="Save player changes"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium">{getPlayerName(player)}</div>
                            {!player.isActive && (
                              <Badge variant="outline" className="mt-1">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {player.position || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {player.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(player)}
                            aria-label={`Edit player: ${getPlayerName(player)}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(player)}
                            aria-label={`Toggle active status: ${getPlayerName(player)}`}
                          >
                            {player.isActive ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDialog.openDialog(player)}
                            aria-label={`Delete player: ${getPlayerName(player)}`}
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
            <DialogTitle>Delete Player</DialogTitle>
            <DialogDescription>
              {deleteDialog.itemToDelete && (
                <>
                  Are you sure you want to delete "{getPlayerName(deleteDialog.itemToDelete)}"? This action
                  cannot be undone.
                  {deleteDialog.itemToDelete._count.LeaguePlayer > 0 && (
                    <div className="mt-2 text-sm font-semibold text-amber-600">
                      This player is assigned to {deleteDialog.itemToDelete._count.LeaguePlayer} league(s).
                      Deleting will remove these associations.
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={deleteDialog.closeDialog}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteDialog.isDeleting}>
              {deleteDialog.isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Player Dialog */}
      <Dialog open={createDialog.open} onOpenChange={createDialog.setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>Create a new player</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                placeholder="e.g., Cristiano"
                value={createDialog.form.firstName}
                onChange={(e) =>
                  createDialog.updateForm({ firstName: e.target.value })
                }
                aria-label="First name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Last Name</label>
              <Input
                placeholder="e.g., Ronaldo"
                value={createDialog.form.lastName}
                onChange={(e) =>
                  createDialog.updateForm({ lastName: e.target.value })
                }
                aria-label="Last name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Position</label>
              <Input
                placeholder="e.g., Forward"
                value={createDialog.form.position}
                onChange={(e) =>
                  createDialog.updateForm({ position: e.target.value })
                }
                aria-label="Position"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active</label>
              <Switch
                checked={createDialog.form.isActive}
                onCheckedChange={(checked) =>
                  createDialog.updateForm({ isActive: checked })
                }
                aria-label="Player active status"
              />
            </div>

            <div>
              <label className="text-sm font-medium">External ID</label>
              <Input
                type="number"
                placeholder="Optional external ID"
                value={createDialog.form.externalId}
                onChange={(e) =>
                  createDialog.updateForm({ externalId: e.target.value })
                }
                aria-label="External ID"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={createDialog.closeDialog}
              disabled={createDialog.isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePlayer} disabled={createDialog.isCreating}>
              {createDialog.isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
