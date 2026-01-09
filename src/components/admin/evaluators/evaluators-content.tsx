'use client'

import * as React from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createEvaluator,
  updateEvaluatorPoints,
  updateEvaluatorName,
  deleteEvaluator,
  getEvaluatorTypes,
} from '@/actions/evaluators'
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

interface EvaluatorType {
  id: number
  name: string
}

interface League {
  id: number
  name: string
}

interface Evaluator {
  id: number
  name: string
  points: string
  entity: string
  leagueId: number
  evaluatorTypeId: number
  EvaluatorType: EvaluatorType
  League: League
}

interface EvaluatorsContentProps {
  evaluators: Evaluator[]
  leagues: League[]
  evaluatorTypes: EvaluatorType[]
  league?: League
}

export function EvaluatorsContent({
  evaluators,
  leagues,
  evaluatorTypes,
  league,
}: EvaluatorsContentProps) {
  const [search, setSearch] = React.useState('')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editPointsValue, setEditPointsValue] = React.useState<string>('')
  const [editNameValue, setEditNameValue] = React.useState<string>('')
  const [isSaving, setIsSaving] = React.useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [evaluatorToDelete, setEvaluatorToDelete] = React.useState<Evaluator | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [createForm, setCreateForm] = React.useState({
    leagueId: '',
    evaluatorTypeId: '',
    name: '',
    points: '',
  })
  const [isCreating, setIsCreating] = React.useState(false)

  // Filter evaluators with optimized string search
  const filteredEvaluators = evaluators.filter((evaluator) => {
    // League filter (only if not on league-specific page)
    if (!league && leagueFilter !== 'all' && evaluator.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // Search filter - optimized: combine searchable fields
    if (search) {
      const searchLower = search.toLowerCase()
      const searchableText = `${evaluator.name} ${evaluator.League.name} ${evaluator.EvaluatorType.name}`.toLowerCase()
      return searchableText.includes(searchLower)
    }

    return true
  })

  const handleStartEdit = (evaluator: Evaluator) => {
    setEditingId(evaluator.id)
    setEditNameValue(evaluator.name)
    setEditPointsValue(evaluator.points)
  }

  const handleCancelEditName = () => {
    setEditingId(null)
    setEditNameValue('')
    setEditPointsValue('')
  }

  const handleCancelEditPoints = () => {
    setEditingId(null)
    setEditNameValue('')
    setEditPointsValue('')
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
      setEditingId(null)
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

  const handleSaveName = async (evaluatorId: number) => {
    if (!editNameValue.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    setIsSaving(true)
    try {
      await updateEvaluatorName(evaluatorId, editNameValue)
      toast.success('Name updated')
      setEditingId(null)
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
    if (!createForm.leagueId || !createForm.evaluatorTypeId || !createForm.name || !createForm.points) {
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
        leagueId: parseInt(createForm.leagueId, 10),
        evaluatorTypeId: parseInt(createForm.evaluatorTypeId, 10),
        name: createForm.name,
        points: parseInt(createForm.points, 10),
      })
      toast.success('Evaluator created')
      setCreateDialogOpen(false)
      setCreateForm({ leagueId: '', evaluatorTypeId: '', name: '', points: '' })
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
      {/* Header with Create Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row">
          <Input
            placeholder="Search by name or league..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {!league && (
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="League" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leagues</SelectItem>
                {leagues.map((lg) => (
                  <SelectItem key={lg.id} value={lg.id.toString()}>
                    {lg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Evaluator
        </Button>
      </div>

      {/* Evaluators Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Scoring Rules</CardTitle>
          <CardDescription>Manage evaluator points for all leagues</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvaluators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No evaluators found</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>League</TableHead>
                    <TableHead>Rule Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluators.map((evaluator) => (
                    <TableRow key={evaluator.id} className="table-row-hover">
                      <TableCell>
                        <Badge variant="secondary">{evaluator.League.name}</Badge>
                      </TableCell>
                      <TableCell>
                        {editingId === evaluator.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="flex-1 h-8"
                              disabled={isSaving}
                              autoFocus
                              aria-label="Evaluator name"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditName}
                                aria-label="Cancel editing name"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSaveName(evaluator.id)}
                                disabled={isSaving}
                                aria-label="Save name"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium">{evaluator.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {evaluator.EvaluatorType.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === evaluator.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={editPointsValue}
                              onChange={(e) => setEditPointsValue(e.target.value)}
                              className="w-16 h-8 text-center"
                              disabled={isSaving}
                              aria-label="Points value"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEditPoints}
                                aria-label="Cancel editing points"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSavePoints(evaluator.id)}
                                disabled={isSaving}
                                aria-label="Save points"
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <span className="font-mono font-bold">{evaluator.points}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingId === evaluator.id ? (
                            <span className="text-sm text-muted-foreground">Editing...</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(evaluator)}
                              aria-label={`Edit evaluator: ${evaluator.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
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
              Are you sure you want to delete "{evaluatorToDelete?.name}" from{' '}
              {evaluatorToDelete?.League.name}? This action cannot be undone.
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
            <DialogTitle>Add New Evaluator</DialogTitle>
            <DialogDescription>Create a new scoring rule for a league</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">League</label>
              <Select
                value={createForm.leagueId}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, leagueId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select league" />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id.toString()}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
