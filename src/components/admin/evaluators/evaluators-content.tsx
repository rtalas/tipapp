'use client'

import { useState } from 'react'
import { Trash2, Edit, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  updateEvaluatorPoints,
  updateEvaluatorName,
  deleteEvaluator,
} from '@/actions/evaluators'
import { logger } from '@/lib/client-logger'
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
import { EvaluatorCreateDialog } from './evaluator-create-dialog'

interface EvaluatorType {
  id: number
  name: string
}

interface League {
  id: number
  name: string
}

interface ScorerRankedConfig {
  rankedPoints: Record<string, number>
  unrankedPoints: number
}

interface Evaluator {
  id: number
  name: string
  points: number
  entity: string
  leagueId: number
  evaluatorTypeId: number
  config: unknown // Prisma JsonValue
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
  const t = useTranslations('admin.evaluators')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editPointsValue, setEditPointsValue] = useState<string>('')
  const [editNameValue, setEditNameValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [evaluatorToDelete, setEvaluatorToDelete] = useState<Evaluator | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

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
    setEditPointsValue(String(evaluator.points))
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditNameValue('')
    setEditPointsValue('')
  }

  const handleSave = async (evaluatorId: number, originalName: string, originalPoints: number) => {
    const nameChanged = editNameValue.trim() !== originalName
    const pointsChanged = editPointsValue !== String(originalPoints)

    if (!nameChanged && !pointsChanged) {
      handleCancelEdit()
      return
    }

    if (!editNameValue.trim()) {
      toast.error(t('validation.nameRequired'))
      return
    }

    if (!editPointsValue || isNaN(Number(editPointsValue))) {
      toast.error(t('validation.invalidNumber'))
      return
    }

    setIsSaving(true)
    try {
      // Update both fields if changed
      if (nameChanged) {
        await updateEvaluatorName({ evaluatorId, name: editNameValue })
      }
      if (pointsChanged) {
        await updateEvaluatorPoints({ evaluatorId, points: parseInt(editPointsValue, 10) })
      }

      toast.success(t('toast.updated'))
      setEditingId(null)
      setEditNameValue('')
      setEditPointsValue('')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('toast.updateFailed'))
      }
      logger.error('Failed to update evaluator', { error, evaluatorId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!evaluatorToDelete) return
    setIsDeleting(true)
    try {
      await deleteEvaluator({ id: evaluatorToDelete.id })
      toast.success(t('toast.deleted'))
      setDeleteDialogOpen(false)
      setEvaluatorToDelete(null)
    } catch (error) {
      toast.error(t('toast.deleteFailed'))
      logger.error('Failed to delete evaluator', { error, evaluatorId: evaluatorToDelete?.id })
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
            placeholder={league ? t('searchPlaceholderLeague') : t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {!league && (
            <Select value={leagueFilter} onValueChange={setLeagueFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('table.league')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allLeagues')}</SelectItem>
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
          {t('addButton')}
        </Button>
      </div>

      {/* Evaluators Table */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>
            {league
              ? t('descriptionLeague', { leagueName: league.name })
              : t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvaluators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('noEvaluatorsFound')}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {!league && <TableHead>{t('table.league')}</TableHead>}
                    <TableHead>{t('table.ruleName')}</TableHead>
                    <TableHead>{t('table.type')}</TableHead>
                    <TableHead className="text-center">{t('table.points')}</TableHead>
                    <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluators.map((evaluator) => (
                    <TableRow key={evaluator.id} className="table-row-hover">
                      {!league && (
                        <TableCell>
                          <Badge variant="secondary">{evaluator.League.name}</Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        {editingId === evaluator.id ? (
                          <Input
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="h-8"
                            disabled={isSaving}
                            autoFocus
                            aria-label="Evaluator name"
                          />
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
                          <Input
                            type="number"
                            min="0"
                            value={editPointsValue}
                            onChange={(e) => setEditPointsValue(e.target.value)}
                            className="w-20 h-8 text-center mx-auto"
                            disabled={isSaving}
                            aria-label="Points value"
                          />
                        ) : evaluator.config && evaluator.EvaluatorType.name === 'scorer' ? (
                          <span className="text-xs font-mono">
                            {(() => {
                              const config = evaluator.config as ScorerRankedConfig
                              return Object.entries(config.rankedPoints)
                                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                .map(([rank, pts]) => `R${rank}:${pts}`)
                                .join(' ') + ` U:${config.unrankedPoints}`
                            })()}
                          </span>
                        ) : (
                          <span className="font-mono font-bold">{evaluator.points}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingId === evaluator.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                aria-label="Cancel editing"
                              >
                                {tCommon('button.cancel')}
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSave(evaluator.id, evaluator.name, evaluator.points)}
                                disabled={isSaving}
                                aria-label="Save changes"
                              >
                                {isSaving ? tCommon('saving') : tCommon('button.save')}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(evaluator)}
                                aria-label={`Edit evaluator: ${evaluator.name}`}
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
                            </>
                          )}
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
            <DialogTitle>{t('dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{evaluatorToDelete?.name}&quot;
              {!league && ` from ${evaluatorToDelete?.League.name}`}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tCommon('button.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? tCommon('deleting') : tCommon('button.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Evaluator Dialog */}
      <EvaluatorCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        league={league}
        leagues={leagues}
        evaluatorTypes={evaluatorTypes}
      />
    </>
  )
}
