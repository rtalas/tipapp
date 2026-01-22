'use client'

import * as React from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createMatchPhase,
  updateMatchPhase,
  deleteMatchPhase,
} from '@/actions/match-phases'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const [search, setSearch] = React.useState('')

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

  const handleCancelEdit = () => {
    inlineEdit.cancelEdit()
  }

  const handleSaveEdit = async (itemId: number) => {
    if (!inlineEdit.form) return

    const rank = parseInt(inlineEdit.form.rank, 10)
    if (isNaN(rank) || rank < 0) {
      toast.error('Rank must be a non-negative number')
      return
    }

    let bestOf: number | null = null
    if (inlineEdit.form.bestOf) {
      bestOf = parseInt(inlineEdit.form.bestOf, 10)
      if (isNaN(bestOf) || bestOf < 1 || bestOf > 7) {
        toast.error('Best of must be between 1 and 7')
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
      toast.success('Match phase updated')
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
      toast.error('Please fill in the name field')
      return
    }

    const rank = parseInt(createDialog.form.rank, 10)
    if (isNaN(rank) || rank < 0) {
      toast.error('Rank must be a non-negative number')
      return
    }

    let bestOf: number | null = null
    if (createDialog.form.bestOf) {
      bestOf = parseInt(createDialog.form.bestOf, 10)
      if (isNaN(bestOf) || bestOf < 1 || bestOf > 7) {
        toast.error('Best of must be between 1 and 7')
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
      toast.success('Match phase created')
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
      toast.success('Match phase deleted')
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete match phase')
      toast.error(message)
      logger.error('Failed to delete match phase', { error, phaseId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
  }

  const getBestOfDisplay = (bestOf: number | null) => {
    if (bestOf === null) {
      return 'Single Game'
    }
    return `Best of ${bestOf}`
  }

  return (
    <>
      {/* Header with Create Button and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={createDialog.openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Match Phase
        </Button>
      </div>

      {/* Match Phases Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Match Phases</CardTitle>
          <CardDescription>Manage tournament phases like Group A, Semifinals, Finals</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPhases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No match phases found</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead>Best Of</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPhases.map((item) => (
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
                                placeholder="Phase name"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                autoFocus
                                aria-label="Phase name"
                              />
                              <Input
                                type="number"
                                min="0"
                                value={inlineEdit.form.rank}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ rank: e.target.value })
                                }
                                placeholder="Rank (0-100)"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label="Rank"
                              />
                              <Select
                                value={inlineEdit.form.bestOf || undefined}
                                onValueChange={(value) =>
                                  inlineEdit.updateForm({ bestOf: value || '' })
                                }
                                disabled={inlineEdit.isSaving}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Single Game" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Best of 1</SelectItem>
                                  <SelectItem value="3">Best of 3</SelectItem>
                                  <SelectItem value="5">Best of 5</SelectItem>
                                  <SelectItem value="7">Best of 7</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2 mt-8">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                aria-label="Cancel editing match phase"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveEdit(item.id)}
                                disabled={inlineEdit.isSaving}
                                aria-label="Save match phase changes"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="font-medium">{item.name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.rank}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getBestOfDisplay(item.bestOf)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {item._count.Match} {item._count.Match === 1 ? 'match' : 'matches'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(item)}
                            aria-label={`Edit match phase: ${item.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDialog.openDialog(item)}
                            aria-label={`Delete match phase: ${item.name}`}
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
            <DialogTitle>Delete Match Phase</DialogTitle>
            <DialogDescription>
              {deleteDialog.itemToDelete && (
                <>
                  Are you sure you want to delete "{deleteDialog.itemToDelete.name}"? This action cannot be
                  undone.
                  {deleteDialog.itemToDelete._count.Match > 0 && (
                    <div className="mt-2 text-sm font-semibold text-amber-600">
                      This phase is used in {deleteDialog.itemToDelete._count.Match}{' '}
                      {deleteDialog.itemToDelete._count.Match !== 1 ? 'matches' : 'match'}. Deleting
                      will unlink these matches from this phase.
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

      {/* Create Match Phase Dialog */}
      <Dialog open={createDialog.open} onOpenChange={createDialog.setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Match Phase</DialogTitle>
            <DialogDescription>Create a new tournament phase or round</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Group A, Semifinals, Final"
                value={createDialog.form.name}
                onChange={(e) =>
                  createDialog.updateForm({ name: e.target.value })
                }
                aria-label="Phase name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Rank</label>
              <Input
                type="number"
                min="0"
                placeholder="0 for earliest phase"
                value={createDialog.form.rank}
                onChange={(e) =>
                  createDialog.updateForm({ rank: e.target.value })
                }
                aria-label="Rank"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for ordering phases (0 = earliest, higher = later)
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Best Of (Optional)</label>
              <Select
                value={createDialog.form.bestOf || undefined}
                onValueChange={(value) =>
                  createDialog.updateForm({ bestOf: value || '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Single Game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Best of 1</SelectItem>
                  <SelectItem value="3">Best of 3</SelectItem>
                  <SelectItem value="5">Best of 5</SelectItem>
                  <SelectItem value="7">Best of 7</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for single-game phases, or select for multi-game series
              </p>
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
            <Button onClick={handleCreateMatchPhase} disabled={createDialog.isCreating}>
              {createDialog.isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
