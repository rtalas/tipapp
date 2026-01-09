'use client'

import * as React from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createSeriesType,
  updateSeriesType,
  deleteSeriesType,
} from '@/actions/series-types'
import { getErrorMessage } from '@/lib/error-handler'
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

interface SeriesType {
  id: number
  name: string
  bestOf: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  _count: {
    LeagueSpecialBetSerie: number
  }
}

interface SeriesTypesContentProps {
  seriesTypes: SeriesType[]
}

interface EditFormData {
  name: string
  bestOf: string
}

interface CreateFormData {
  name: string
  bestOf: string
}

export function SeriesTypesContent({ seriesTypes }: SeriesTypesContentProps) {
  const [search, setSearch] = React.useState('')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<SeriesType>()
  const createDialog = useCreateDialog<CreateFormData>({
    name: '',
    bestOf: '',
  })

  // Filter series types
  const filteredSeriesTypes = seriesTypes.filter((item) => {
    if (search) {
      const searchLower = search.toLowerCase()
      return item.name.toLowerCase().includes(searchLower)
    }
    return true
  })

  const handleStartEdit = (item: SeriesType) => {
    inlineEdit.startEdit(item.id, {
      name: item.name,
      bestOf: item.bestOf.toString(),
    })
  }

  const handleCancelEdit = () => {
    inlineEdit.cancelEdit()
  }

  const handleSaveEdit = async (itemId: number) => {
    if (!inlineEdit.form) return

    const bestOf = parseInt(inlineEdit.form.bestOf, 10)
    if (isNaN(bestOf) || bestOf < 1 || bestOf > 7) {
      toast.error('Best of must be between 1 and 7')
      return
    }

    inlineEdit.setSaving(true)
    try {
      await updateSeriesType({
        id: itemId,
        name: inlineEdit.form.name,
        bestOf,
      })
      toast.success('Series type updated')
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to update series type')
      toast.error(message)
      console.error(error)
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleCreateSeriesType = async () => {
    if (!createDialog.form.name || !createDialog.form.bestOf) {
      toast.error('Please fill in all required fields')
      return
    }

    const bestOf = parseInt(createDialog.form.bestOf, 10)
    if (isNaN(bestOf) || bestOf < 1 || bestOf > 7) {
      toast.error('Best of must be between 1 and 7')
      return
    }

    createDialog.startCreating()
    try {
      await createSeriesType({
        name: createDialog.form.name,
        bestOf,
      })
      toast.success('Series type created')
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create series type')
      toast.error(message)
      console.error(error)
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deleteSeriesType(deleteDialog.itemToDelete.id)
      toast.success('Series type deleted')
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete series type')
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
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Button onClick={createDialog.openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Series Type
        </Button>
      </div>

      {/* Series Types Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Series Types</CardTitle>
          <CardDescription>Manage global series templates (e.g., Best of 7, Best of 5)</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSeriesTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No series types found</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Best Of</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSeriesTypes.map((item) => (
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
                                placeholder="Series name"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                autoFocus
                                aria-label="Series name"
                              />
                              <Input
                                type="number"
                                min="1"
                                max="7"
                                value={inlineEdit.form.bestOf}
                                onChange={(e) =>
                                  inlineEdit.updateForm({ bestOf: e.target.value })
                                }
                                placeholder="Best of (1-7)"
                                className="h-8"
                                disabled={inlineEdit.isSaving}
                                aria-label="Best of"
                              />
                            </div>
                            <div className="flex items-center gap-2 mt-8">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                aria-label="Cancel editing series type"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveEdit(item.id)}
                                disabled={inlineEdit.isSaving}
                                aria-label="Save series type changes"
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
                        <Badge variant="secondary">Best of {item.bestOf}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(item)}
                            aria-label={`Edit series type: ${item.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDialog.openDialog(item)}
                            aria-label={`Delete series type: ${item.name}`}
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
            <DialogTitle>Delete Series Type</DialogTitle>
            <DialogDescription>
              {deleteDialog.itemToDelete && (
                <>
                  Are you sure you want to delete "{deleteDialog.itemToDelete.name}"? This action cannot be
                  undone.
                  {deleteDialog.itemToDelete._count.LeagueSpecialBetSerie > 0 && (
                    <div className="mt-2 text-sm font-semibold text-amber-600">
                      This series type is used in {deleteDialog.itemToDelete._count.LeagueSpecialBetSerie}{' '}
                      league{deleteDialog.itemToDelete._count.LeagueSpecialBetSerie !== 1 ? 's' : ''}. Deleting
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

      {/* Create Series Type Dialog */}
      <Dialog open={createDialog.open} onOpenChange={createDialog.setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Series Type</DialogTitle>
            <DialogDescription>Create a new series template</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Stanley Cup Playoff Series"
                value={createDialog.form.name}
                onChange={(e) =>
                  createDialog.updateForm({ name: e.target.value })
                }
                aria-label="Series type name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Best Of</label>
              <Input
                type="number"
                min="1"
                max="7"
                placeholder="e.g., 7 for best-of-7"
                value={createDialog.form.bestOf}
                onChange={(e) =>
                  createDialog.updateForm({ bestOf: e.target.value })
                }
                aria-label="Best of"
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many games needed to win the series (1-7)
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
            <Button onClick={handleCreateSeriesType} disabled={createDialog.isCreating}>
              {createDialog.isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
