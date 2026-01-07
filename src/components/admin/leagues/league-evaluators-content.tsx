'use client'

import * as React from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createEvaluator,
  updateEvaluatorPoints,
  updateEvaluatorName,
  deleteEvaluator,
} from '@/actions/evaluators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface EvaluatorType {
  id: number
  name: string
}

interface Evaluator {
  id: number
  name: string
  points: string
  evaluatorTypeId: number
  EvaluatorType: EvaluatorType
}

interface LeagueEvaluatorsContentProps {
  leagueId: number
  leagueName: string
  evaluators: Evaluator[]
  evaluatorTypes: EvaluatorType[]
}

export function LeagueEvaluatorsContent({
  leagueId,
  leagueName,
  evaluators,
  evaluatorTypes,
}: LeagueEvaluatorsContentProps) {
  const [editingPointsId, setEditingPointsId] = React.useState<number | null>(null)
  const [editingNameId, setEditingNameId] = React.useState<number | null>(null)
  const [editPointsValue, setEditPointsValue] = React.useState<string>('')
  const [editNameValue, setEditNameValue] = React.useState<string>('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [evaluatorToDelete, setEvaluatorToDelete] = React.useState<Evaluator | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({
    evaluatorTypeId: '',
    name: '',
    points: '',
  })
  const [isCreating, setIsCreating] = React.useState(false)

  const handleEditPoints = (evaluator: Evaluator) => {
    setEditingPointsId(evaluator.id)
    setEditPointsValue(evaluator.points)
  }

  const handleSavePoints = async (evaluatorId: number) => {
    if (!editPointsValue || isNaN(Number(editPointsValue))) {
      toast.error('Please enter a valid number')
      return
    }

    setIsSaving(true)
    try {
      await updateEvaluatorPoints(evaluatorId, parseInt(editPointsValue, 10))
      toast.success('Points updated')
      setEditingPointsId(null)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update points')
      }
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditName = (evaluator: Evaluator) => {
    setEditingNameId(evaluator.id)
    setEditNameValue(evaluator.name)
  }

  const handleSaveName = async (evaluatorId: number) => {
    if (!editNameValue.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      await updateEvaluatorName(evaluatorId, editNameValue)
      toast.success('Name updated')
      setEditingNameId(null)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update name')
      }
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateEvaluator = async () => {
    if (!createForm.evaluatorTypeId || !createForm.name || !createForm.points) {
      toast.error('Please fill in all fields')
      return
    }

    if (isNaN(Number(createForm.points))) {
      toast.error('Points must be a valid number')
      return
    }

    setIsCreating(true)
    try {
      await createEvaluator({
        leagueId,
        evaluatorTypeId: parseInt(createForm.evaluatorTypeId, 10),
        name: createForm.name,
        points: parseInt(createForm.points, 10),
      })
      toast.success('Evaluator created')
      setCreateDialogOpen(false)
      setCreateForm({ evaluatorTypeId: '', name: '', points: '' })
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create evaluator')
      }
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!evaluatorToDelete) return
    setIsDeleting(true)
    try {
      await deleteEvaluator(evaluatorToDelete.id)
      toast.success('Evaluator deleted')
      setDeleteDialogOpen(false)
      setEvaluatorToDelete(null)
    } catch (error) {
      toast.error('Failed to delete evaluator')
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Evaluator
        </Button>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Scoring Rules</CardTitle>
          <CardDescription>Manage evaluator points for {leagueName}</CardDescription>
        </CardHeader>
        <CardContent>
          {evaluators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No evaluators configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add evaluators to enable scoring for this league
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluators.map((evaluator) => (
                    <TableRow key={evaluator.id} className="table-row-hover">
                      <TableCell>
                        {editingNameId === evaluator.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="flex-1 h-8"
                              disabled={isSaving}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSaveName(evaluator.id)}
                              disabled={isSaving}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium cursor-pointer hover:text-primary">
                            {evaluator.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {evaluator.EvaluatorType.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingPointsId === evaluator.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={editPointsValue}
                              onChange={(e) => setEditPointsValue(e.target.value)}
                              className="w-16 h-8 text-center"
                              disabled={isSaving}
                            />
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSavePoints(evaluator.id)}
                              disabled={isSaving}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditPoints(evaluator)}
                            className="font-mono font-bold hover:underline cursor-pointer"
                          >
                            {evaluator.points}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditName(evaluator)}
                            aria-label={`Edit name: ${evaluator.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPoints(evaluator)}
                            aria-label={`Edit points: ${evaluator.name}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEvaluatorToDelete(evaluator)
                              setDeleteDialogOpen(true)
                            }}
                            aria-label={`Delete evaluator: ${evaluator.name}`}
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Evaluator</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{evaluatorToDelete?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Evaluator Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Evaluator</DialogTitle>
            <DialogDescription>Create a new scoring rule for {leagueName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Evaluator Type</label>
              <Select
                value={createForm.evaluatorTypeId}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, evaluatorTypeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {evaluatorTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id.toString()}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Exact Score"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium">Points</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g., 5"
                value={createForm.points}
                onChange={(e) =>
                  setCreateForm({ ...createForm, points: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateEvaluator} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
