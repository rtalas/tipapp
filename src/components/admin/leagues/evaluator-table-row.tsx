import { Trash2, Edit } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { EvaluatorForm } from './evaluator-form'
import { Button } from '@/components/ui/button'
import {
  TableCell,
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

interface EditFormData {
  evaluatorTypeId: string
  name: string
  points: string
  config?: ScorerRankedConfig | null
}

interface EvaluatorTableRowProps {
  evaluator: Evaluator
  isEditing: boolean
  editForm: EditFormData | null
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onFormChange: (updates: Partial<EditFormData>) => void
  isSaving: boolean
  evaluatorTypes: EvaluatorType[]
}

export function EvaluatorTableRow({
  evaluator,
  isEditing,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onFormChange,
  isSaving,
  evaluatorTypes,
}: EvaluatorTableRowProps) {
  const tCommon = useTranslations('admin.common')
  const t = useTranslations('admin.evaluators')

  return (
    <>
      {isEditing && editForm ? (
        <TableRow className="table-row-hover">
          <TableCell colSpan={4} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <EvaluatorForm
                  formData={editForm}
                  onChange={onFormChange}
                  evaluatorTypes={evaluatorTypes}
                  disabled={isSaving}
                  mode="inline"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelEdit}
                  aria-label="Cancel editing"
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={onSaveEdit}
                  disabled={isSaving}
                  aria-label="Save changes"
                >
                  {tCommon('save')}
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : (
        <TableRow className="table-row-hover">
          <TableCell>
            <span className="font-medium">{evaluator.name}</span>
          </TableCell>
          <TableCell>
            <span className="text-sm text-muted-foreground">
              {evaluator.EvaluatorType.name}
            </span>
          </TableCell>
          <TableCell className="text-center">
            {evaluator.config && typeof evaluator.config === 'object' ? (
              <div className="text-xs space-y-1">
                {Object.entries((evaluator.config as ScorerRankedConfig).rankedPoints)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([rank, points]) => (
                    <div key={rank}>
                      {t('rankDisplay', { rank })} <span className="font-mono font-bold">{points}</span>
                    </div>
                  ))}
                <div className="text-muted-foreground">
                  {t('otherLabel')} <span className="font-mono font-bold">{(evaluator.config as ScorerRankedConfig).unrankedPoints}</span>
                </div>
              </div>
            ) : (
              <span className="font-mono font-bold">{evaluator.points}</span>
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartEdit}
                aria-label={`Edit evaluator: ${evaluator.name}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                aria-label={`Delete evaluator: ${evaluator.name}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
