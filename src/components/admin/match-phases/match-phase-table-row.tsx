import React from 'react'
import { Trash2, Edit } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MatchPhaseForm } from './match-phase-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TableCell,
  TableRow,
} from '@/components/ui/table'

interface MatchPhase {
  id: number
  name: string
  rank: number
  bestOf: number | null
  _count: {
    Match: number
  }
}

interface EditFormData {
  name: string
  rank: string
  bestOf: string
}

interface MatchPhaseTableRowProps {
  matchPhase: MatchPhase
  isEditing: boolean
  editForm: EditFormData | null
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onFormChange: (updates: Partial<EditFormData>) => void
  isSaving: boolean
}

export function MatchPhaseTableRow({
  matchPhase,
  isEditing,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onFormChange,
  isSaving,
}: MatchPhaseTableRowProps) {
  const t = useTranslations('admin.matchPhases')
  const tCommon = useTranslations('admin.common')

  const getBestOfDisplay = (bestOf: number | null) => {
    if (bestOf === null) {
      return t('bestOf.single')
    }
    return t('bestOf.multiple', { count: bestOf })
  }

  return (
    <TableRow className="table-row-hover">
      <TableCell>
        {isEditing && editForm ? (
          <div className="flex items-start gap-2 min-w-max">
            <div className="flex-1">
              <MatchPhaseForm
                formData={editForm}
                onChange={onFormChange}
                disabled={isSaving}
                mode="inline"
              />
            </div>
            <div className="flex items-center gap-2 mt-8">
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelEdit}
                aria-label={t('form.cancelLabel')}
              >
                {tCommon('button.cancel')}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onSaveEdit}
                disabled={isSaving}
                aria-label={t('form.saveLabel')}
              >
                {tCommon('button.save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="font-medium">{matchPhase.name}</div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{matchPhase.rank}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{getBestOfDisplay(matchPhase.bestOf)}</Badge>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {t('usage', { count: matchPhase._count.Match })}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
            aria-label={`Edit match phase: ${matchPhase.name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={`Delete match phase: ${matchPhase.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
