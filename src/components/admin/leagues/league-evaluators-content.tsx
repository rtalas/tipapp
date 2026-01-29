'use client'

import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  createEvaluator,
  updateEvaluator,
  deleteEvaluator,
} from '@/actions/evaluators'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/client-logger'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { useCreateDialog } from '@/hooks/useCreateDialog'
import { DeleteEntityDialog } from '@/components/admin/common/delete-entity-dialog'
import { EvaluatorTableRow } from './evaluator-table-row'
import { CreateEvaluatorDialog } from './create-evaluator-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ScorerRankedConfig } from '@/lib/evaluators/types'

interface EvaluatorType {
  id: number
  name: string
}

interface Evaluator {
  id: number
  name: string
  points: number
  evaluatorTypeId: number
  config?: unknown // Prisma JsonValue
  EvaluatorType: EvaluatorType
}

interface LeagueEvaluatorsContentProps {
  leagueId: number
  leagueName: string
  evaluators: Evaluator[]
  evaluatorTypes: EvaluatorType[]
}

interface EditFormData {
  evaluatorTypeId: string
  name: string
  points: string
  config?: ScorerRankedConfig | null
}

interface CreateFormData {
  evaluatorTypeId: string
  name: string
  points: string
  config?: ScorerRankedConfig | null
}

export function LeagueEvaluatorsContent({
  leagueId,
  leagueName,
  evaluators,
  evaluatorTypes,
}: LeagueEvaluatorsContentProps) {
  const t = useTranslations('admin.leagueEvaluators')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<Evaluator>()
  const createDialog = useCreateDialog<CreateFormData>({
    evaluatorTypeId: '',
    name: '',
    points: '',
  })

  const handleStartEdit = (evaluator: Evaluator) => {
    // Check if this is a scorer evaluator
    const isScorer = evaluator.EvaluatorType.name === 'scorer'

    // Cast config to proper type if it exists, or initialize default for scorer
    let config: ScorerRankedConfig | null = null
    if (evaluator.config && typeof evaluator.config === 'object') {
      config = evaluator.config as ScorerRankedConfig
    } else if (isScorer) {
      // Initialize default config for scorer evaluators without one
      config = {
        rankedPoints: {
          '1': evaluator.points,
        },
        unrankedPoints: evaluator.points,
      }
    }

    inlineEdit.startEdit(evaluator.id, {
      evaluatorTypeId: evaluator.evaluatorTypeId.toString(),
      name: evaluator.name,
      points: String(evaluator.points),
      config,
    })
  }

  const handleSaveEdit = async (evaluatorId: number) => {
    if (!inlineEdit.form) return

    if (!inlineEdit.form.name.trim()) {
      toast.error(t('nameValidation'))
      return
    }

    // Validate config if it exists
    if (inlineEdit.form.config) {
      if (Object.keys(inlineEdit.form.config.rankedPoints).length === 0) {
        toast.error('At least one ranking level is required')
        return
      }
    } else {
      // Only validate points if not using config
      if (!inlineEdit.form.points || isNaN(Number(inlineEdit.form.points))) {
        toast.error(t('pointsValidation'))
        return
      }
    }

    inlineEdit.setSaving(true)
    try {
      await updateEvaluator({
        evaluatorId,
        name: inlineEdit.form.name,
        // Set points to 0 for scorers with config since actual points come from config
        points: inlineEdit.form.config ? 0 : parseInt(inlineEdit.form.points, 10),
        config: inlineEdit.form.config,
      })
      toast.success(t('evaluatorUpdated'))
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, t('evaluatorUpdateFailed'))
      toast.error(message)
      logger.error('Failed to update evaluator', { error, evaluatorId })
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleCreateEvaluator = async () => {
    if (!createDialog.form.evaluatorTypeId || !createDialog.form.name || !createDialog.form.points) {
      toast.error(t('fillValidation'))
      return
    }

    if (isNaN(Number(createDialog.form.points))) {
      toast.error(t('pointsValidation'))
      return
    }

    createDialog.startCreating()
    try {
      await createEvaluator({
        leagueId,
        evaluatorTypeId: parseInt(createDialog.form.evaluatorTypeId, 10),
        name: createDialog.form.name,
        points: parseInt(createDialog.form.points, 10),
      })
      toast.success(t('evaluatorCreated'))
      createDialog.finishCreating()
    } catch (error) {
      const message = getErrorMessage(error, t('evaluatorCreateFailed'))
      toast.error(message)
      logger.error('Failed to create evaluator', { error, leagueId })
      createDialog.cancelCreating()
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      await deleteEvaluator({ id: deleteDialog.itemToDelete.id })
      toast.success(t('evaluatorDeleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, t('evaluatorDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete evaluator', { error, evaluatorId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={createDialog.openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('addEvaluator')}
        </Button>
      </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>{t('scoringRules')}</CardTitle>
          <CardDescription>{t('scoringRulesDescription', { leagueName })}</CardDescription>
        </CardHeader>
        <CardContent>
          {evaluators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">{t('noEvaluators')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('noEvaluatorsHelper')}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('ruleName')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead className="text-center">{t('points')}</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluators.map((evaluator) => (
                    <EvaluatorTableRow
                      key={evaluator.id}
                      evaluator={evaluator}
                      isEditing={inlineEdit.editingId === evaluator.id}
                      editForm={inlineEdit.form ?? null}
                      onStartEdit={() => handleStartEdit(evaluator)}
                      onSaveEdit={() => handleSaveEdit(evaluator.id)}
                      onCancelEdit={inlineEdit.cancelEdit}
                      onDelete={() => deleteDialog.openDialog(evaluator)}
                      onFormChange={inlineEdit.updateForm}
                      isSaving={inlineEdit.isSaving}
                      evaluatorTypes={evaluatorTypes}
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
        description={deleteDialog.itemToDelete ? t('deleteConfirm', { name: deleteDialog.itemToDelete.name }) : ''}
        onConfirm={handleDelete}
        isDeleting={deleteDialog.isDeleting}
      />

      {/* Create Evaluator Dialog */}
      <CreateEvaluatorDialog
        open={createDialog.open}
        onOpenChange={createDialog.setOpen}
        formData={createDialog.form}
        onFormChange={createDialog.updateForm}
        onCreate={handleCreateEvaluator}
        isCreating={createDialog.isCreating}
        evaluatorTypes={evaluatorTypes}
        leagueName={leagueName}
      />
    </>
  )
}
