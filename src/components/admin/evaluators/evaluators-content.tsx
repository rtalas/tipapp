'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  updateEvaluatorPoints,
  updateEvaluatorName,
  updateEvaluator,
  deleteEvaluator,
} from '@/actions/evaluators'
import { logger } from '@/lib/logging/client-logger'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EvaluatorCreateDialog } from './evaluator-create-dialog'
import { EvaluatorTableRow } from './evaluator-table-row'
import { ScorerRankingEditor } from './scorer-ranking-editor'
import { ExactPlayerEditor } from './exact-player-editor'
import type { ScorerRankedConfig, ExactPlayerConfig } from '@/lib/evaluators/types'
import { POSITIONS_BY_SPORT } from '@/lib/constants'

interface EvaluatorType {
  id: number
  name: string
}

interface League {
  id: number
  name: string
  sportId: number
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
  const [editConfig, setEditConfig] = useState<ScorerRankedConfig | null>(null)
  const [editExactPlayerConfig, setEditExactPlayerConfig] = useState<ExactPlayerConfig | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Get sport ID from league
  const sportId = league?.sportId
  const availablePositions = sportId ? (POSITIONS_BY_SPORT[sportId] || []) : []
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

    // Initialize config for scorer evaluators
    const isScorer = evaluator.EvaluatorType.name === 'scorer'
    const isExactPlayer = evaluator.EvaluatorType.name === 'exact_player'

    if (isScorer) {
      if (evaluator.config && typeof evaluator.config === 'object') {
        setEditConfig(evaluator.config as ScorerRankedConfig)
      } else {
        // Initialize default config
        setEditConfig({
          rankedPoints: { '1': evaluator.points },
          unrankedPoints: evaluator.points,
        })
      }
      setEditExactPlayerConfig(null)
    } else if (isExactPlayer) {
      if (evaluator.config && typeof evaluator.config === 'object' && 'positions' in evaluator.config) {
        setEditExactPlayerConfig(evaluator.config as ExactPlayerConfig)
      } else {
        setEditExactPlayerConfig({ positions: null })
      }
      setEditConfig(null)
    } else {
      setEditConfig(null)
      setEditExactPlayerConfig(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditNameValue('')
    setEditPointsValue('')
    setEditConfig(null)
    setEditExactPlayerConfig(null)
  }

  const handleSave = async (evaluatorId: number, originalName: string, originalPoints: number) => {
    const nameChanged = editNameValue.trim() !== originalName
    const pointsChanged = editPointsValue !== String(originalPoints)
    const hasConfig = editConfig !== null
    const hasExactPlayerConfig = editExactPlayerConfig !== null

    if (!nameChanged && !pointsChanged && !hasConfig && !hasExactPlayerConfig) {
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

    // Validate config if present
    if (hasConfig && editConfig) {
      if (Object.keys(editConfig.rankedPoints).length === 0) {
        toast.error(t('validation.atLeastOneRank'))
        return
      }
    }

    setIsSaving(true)
    try {
      // If editing scorer with config, use updateEvaluator which supports config
      if (hasConfig) {
        // For scorers with config, set points to 0 since actual points come from config
        await updateEvaluator({
          evaluatorId,
          name: editNameValue.trim(),
          points: 0,
          config: editConfig,
        })
      } else if (hasExactPlayerConfig) {
        // For exact_player with position filter
        await updateEvaluator({
          evaluatorId,
          name: editNameValue.trim(),
          points: parseInt(editPointsValue, 10),
          config: editExactPlayerConfig,
        })
      } else {
        // For non-scorer evaluators, use the old method
        if (nameChanged) {
          await updateEvaluatorName({ evaluatorId, name: editNameValue })
        }
        if (pointsChanged) {
          await updateEvaluatorPoints({ evaluatorId, points: parseInt(editPointsValue, 10) })
        }
      }

      toast.success(t('toast.updated'))
      handleCancelEdit()
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

  const colSpan = league ? 4 : 5

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
                  {filteredEvaluators.map((evaluator) => {
                    const isEditingThisRow = editingId === evaluator.id
                    const isEditingScorer = isEditingThisRow && editConfig !== null
                    const isEditingExactPlayer = isEditingThisRow && editExactPlayerConfig !== null

                    if (isEditingExactPlayer && editExactPlayerConfig) {
                      return (
                        <ExactPlayerEditor
                          key={evaluator.id}
                          colSpan={colSpan}
                          editNameValue={editNameValue}
                          editPointsValue={editPointsValue}
                          editConfig={editExactPlayerConfig}
                          availablePositions={availablePositions}
                          isSaving={isSaving}
                          onNameChange={setEditNameValue}
                          onPointsChange={setEditPointsValue}
                          onConfigChange={setEditExactPlayerConfig}
                          onCancel={handleCancelEdit}
                          onSave={() => handleSave(evaluator.id, evaluator.name, evaluator.points)}
                        />
                      )
                    }

                    if (isEditingScorer && editConfig) {
                      return (
                        <ScorerRankingEditor
                          key={evaluator.id}
                          colSpan={colSpan}
                          editNameValue={editNameValue}
                          editConfig={editConfig}
                          isSaving={isSaving}
                          onNameChange={setEditNameValue}
                          onConfigChange={setEditConfig}
                          onCancel={handleCancelEdit}
                          onSave={() => handleSave(evaluator.id, evaluator.name, evaluator.points)}
                        />
                      )
                    }

                    return (
                      <EvaluatorTableRow
                        key={evaluator.id}
                        evaluator={evaluator}
                        showLeague={!league}
                        isEditing={isEditingThisRow}
                        editNameValue={editNameValue}
                        editPointsValue={editPointsValue}
                        isSaving={isSaving}
                        onStartEdit={() => handleStartEdit(evaluator)}
                        onCancelEdit={handleCancelEdit}
                        onSave={() => handleSave(evaluator.id, evaluator.name, evaluator.points)}
                        onDelete={() => {
                          setEvaluatorToDelete(evaluator)
                          setDeleteDialogOpen(true)
                        }}
                        onNameChange={setEditNameValue}
                        onPointsChange={setEditPointsValue}
                      />
                    )
                  })}
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
