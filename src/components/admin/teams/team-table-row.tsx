import React from 'react'
import { Trash2, Edit } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { TeamForm } from './team-form'
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

interface Team {
  id: number
  name: string
  nickname: string | null
  shortcut: string
  flagIcon: string | null
  flagType: string | null
  sportId: number
  Sport: Sport
}

interface EditFormData {
  name: string
  nickname: string
  shortcut: string
  sportId: string
  flagIcon: string
  flagType: string
}

interface TeamTableRowProps {
  team: Team
  isEditing: boolean
  editForm: EditFormData | null
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onFormChange: (updates: Partial<EditFormData>) => void
  isSaving: boolean
  sports: Sport[]
}

export function TeamTableRow({
  team,
  isEditing,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onFormChange,
  isSaving,
  sports,
}: TeamTableRowProps) {
  const t = useTranslations('admin.teams')
  const tCommon = useTranslations('admin.common')

  return (
    <TableRow className="table-row-hover">
      <TableCell>
        {isEditing && editForm ? (
          <div className="flex items-start gap-2 min-w-max">
            <div className="flex-1">
              <TeamForm
                formData={editForm}
                onChange={onFormChange}
                sports={sports}
                disabled={isSaving}
                mode="inline"
              />
            </div>
            <div className="flex items-center gap-2 mt-8">
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelEdit}
                aria-label={t('cancelEditing')}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onSaveEdit}
                disabled={isSaving}
                aria-label={t('saveChanges')}
              >
                {tCommon('save')}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="font-medium">{team.name}</div>
            {team.nickname && (
              <div className="text-sm text-muted-foreground">{team.nickname}</div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <span className="font-mono text-sm text-muted-foreground">{team.shortcut}</span>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{team.Sport.name}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
            aria-label={t('editTeam', { name: team.name })}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={t('deleteTeam', { name: team.name })}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
