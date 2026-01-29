import React from 'react'
import { Trash2, Edit } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SpecialBetTypeForm } from './special-bet-type-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TableCell,
  TableRow,
} from '@/components/ui/table'

interface Sport {
  id: number
  name: string
}

interface SpecialBetSingleType {
  id: number
  name: string
}

interface SpecialBetType {
  id: number
  name: string
  sportId: number
  specialBetSingleTypeId: number
  Sport: Sport
  SpecialBetSingleType: SpecialBetSingleType
}

interface EditFormData {
  name: string
  sportId: string
  specialBetSingleTypeId: string
}

interface SpecialBetTypeTableRowProps {
  item: SpecialBetType
  isEditing: boolean
  editForm: EditFormData | null
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onFormChange: (updates: Partial<EditFormData>) => void
  isSaving: boolean
  sports: Sport[]
  betTypes: SpecialBetSingleType[]
}

export function SpecialBetTypeTableRow({
  item,
  isEditing,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onFormChange,
  isSaving,
  sports,
  betTypes,
}: SpecialBetTypeTableRowProps) {
  const t = useTranslations('admin.specialBetTypes')
  const tCommon = useTranslations('admin.common')

  return (
    <TableRow className="table-row-hover">
      <TableCell>
        {isEditing && editForm ? (
          <div className="flex items-start gap-2 min-w-max">
            <div className="flex-1">
              <SpecialBetTypeForm
                formData={editForm}
                onChange={onFormChange}
                sports={sports}
                betTypes={betTypes}
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
          <div className="font-medium">{item.name}</div>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{item.Sport.name}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{item.SpecialBetSingleType.name}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
            aria-label={`Edit special bet type: ${item.name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={`Delete special bet type: ${item.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
