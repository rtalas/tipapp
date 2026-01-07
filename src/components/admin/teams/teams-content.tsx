'use client'

import * as React from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createTeam,
  updateTeam,
  deleteTeam,
} from '@/actions/teams'
import { getErrorMessage } from '@/lib/error-handler'
import { validateTeamCreate, validateTeamEdit } from '@/lib/validation-client'
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

interface Team {
  id: number
  name: string
  nickname: string | null
  shortcut: string
  flagIcon: string | null
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
}

interface EditFormData {
  name: string
  nickname: string
  shortcut: string
  sportId: string
}

interface CreateFormData {
  sportId: string
  name: string
  nickname: string
  shortcut: string
  flagIcon: string
  externalId: string
}

export function TeamsContent({ teams, sports }: TeamsContentProps) {
  const [search, setSearch] = React.useState('')
  const [sportFilter, setSportFilter] = React.useState<string>('all')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<Team>()
  const createDialog = useCreateDialog<CreateFormData>({
    sportId: '',
    name: '',
    nickname: '',
    shortcut: '',
    flagIcon: '',
    externalId: '',
  })

  // Filter teams
  const filteredTeams = teams.filter((team) => {
    // Sport filter
    if (sportFilter !== 'all' && team.sportId !== parseInt(sportFilter, 10)) {
      return false
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      if (
        !team.name.toLowerCase().includes(searchLower) &&
        !team.shortcut.toLowerCase().includes(searchLower) &&
        !(team.nickname && team.nickname.toLowerCase().includes(searchLower))
      ) {
        return false
      }
    }

    return true
  })

  const handleStartEdit = (team: Team) => {
    inlineEdit.startEdit(team.id, {
      name: team.name,
      nickname: team.nickname || '',
      shortcut: team.shortcut,
      sportId: team.sportId.toString(),
    })
  }

  const handleSaveEdit = async (teamId: number) => {
    if (!inlineEdit.form) return

    // Validate form data
    const validation = validateTeamEdit({
      id: teamId,
      name: inlineEdit.form.name,
      nickname: inlineEdit.form.nickname,
      shortcut: inlineEdit.form.shortcut,
      sportId: parseInt(inlineEdit.form.sportId, 10),
    })

    if (!validation.success) {
      const message = getErrorMessage(validation.error, 'Validation failed')
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
      })
      toast.success('Team updated')
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update team')
      toast.error(message)
      console.error(error)
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleCreateTeam = async () => {
    // Validate form data
    const validation = validateTeamCreate({
      sportId: parseInt(createDialog.form.sportId, 10) || undefined,
      name: createDialog.form.name,
      nickname: createDialog.form.nickname,
      shortcut: createDialog.form.shortcut,
      flagIcon: createDialog.form.flagIcon,
      externalId: createDialog.form.externalId ? parseInt(createDialog.form.externalId, 10) : undefined,
    })

    if (!validation.success) {
      const message = getErrorMessage(validation.error, 'Validation failed')
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
        externalId: createDialog.form.externalId ? parseInt(createDialog.form.externalId, 10) : undefined,
      })
      toast.success('Team created')
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create team')
      toast.error(message)
      console.error(error)
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deleteTeam(deleteDialog.itemToDelete.id)
      toast.success('Team deleted')
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete team')
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
            placeholder="Search by name, nickname, or shortcut..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {sports.map((sport) => (
                <SelectItem key={sport.id} value={sport.id.toString()}>
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={createDialog.openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Team
        </Button>
      </div>

      {/* Teams Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Teams</CardTitle>
          <CardDescription>Manage teams across all sports</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTeams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No teams found</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Shortcut</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
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
                                placeholder="Team name"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                autoFocus
                                aria-label="Team name"
                              />
                              <Input
                                type="text"
                                value={inlineEdit.form.nickname}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ nickname: e.target.value })
                                }
                                placeholder="Nickname (optional)"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label="Team nickname"
                              />
                              <Input
                                type="text"
                                value={inlineEdit.form.shortcut}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ shortcut: e.target.value })
                                }
                                placeholder="Shortcut"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label="Team shortcut"
                              />
                              <Select
                                value={inlineEdit.form.sportId}
                                onValueChange={(value) =>
                                  inlineEdit.updateForm({ sportId: value })
                                }
                              >
                                <SelectTrigger className="h-8" aria-label="Team sport">
                                  <SelectValue placeholder="Select sport" />
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
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSaveEdit(team.id)}
                              disabled={inlineEdit.isSaving}
                              className="mt-8"
                              aria-label="Save team changes"
                            >
                              Save
                            </Button>
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
                            aria-label={`Edit team: ${team.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDialog.openDialog(team)}
                            aria-label={`Delete team: ${team.name}`}
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
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              {deleteDialog.itemToDelete && (
                <>
                  Are you sure you want to delete "{deleteDialog.itemToDelete.name}"? This action cannot be
                  undone.
                  {deleteDialog.itemToDelete._count.LeagueTeam > 0 && (
                    <div className="mt-2 text-sm font-semibold text-amber-600">
                      This team is assigned to {deleteDialog.itemToDelete._count.LeagueTeam} league(s). Deleting
                      will remove these associations.
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

      {/* Create Team Dialog */}
      <Dialog open={createDialog.open} onOpenChange={createDialog.setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team</DialogTitle>
            <DialogDescription>Create a new team</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Sport</label>
              <Select
                value={createDialog.form.sportId}
                onValueChange={(value) =>
                  createDialog.updateForm({ sportId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sport" />
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
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Manchester United"
                value={createDialog.form.name}
                onChange={(e) =>
                  createDialog.updateForm({ name: e.target.value })
                }
                aria-label="Team name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Nickname</label>
              <Input
                placeholder="e.g., Man United"
                value={createDialog.form.nickname}
                onChange={(e) =>
                  createDialog.updateForm({ nickname: e.target.value })
                }
                aria-label="Team nickname"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Shortcut</label>
              <Input
                placeholder="e.g., MAN"
                value={createDialog.form.shortcut}
                onChange={(e) =>
                  createDialog.updateForm({ shortcut: e.target.value })
                }
                aria-label="Team shortcut"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Flag Icon</label>
              <Input
                placeholder="e.g., 🏴󐁧󐁢󐁥󐁮󐁧󐁿"
                value={createDialog.form.flagIcon}
                onChange={(e) =>
                  createDialog.updateForm({ flagIcon: e.target.value })
                }
                aria-label="Flag icon"
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
            <Button onClick={handleCreateTeam} disabled={createDialog.isCreating}>
              {createDialog.isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
