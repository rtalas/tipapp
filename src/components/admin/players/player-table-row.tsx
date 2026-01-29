import React from 'react'
import { Trash2, Edit, Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlayerForm } from './player-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TableCell,
  TableRow,
} from '@/components/ui/table'

interface Player {
  id: number
  firstName: string | null
  lastName: string | null
  isActive: boolean
  position: string | null
}

interface EditFormData {
  firstName: string
  lastName: string
  position: string
}

interface PlayerTableRowProps {
  player: Player
  isEditing: boolean
  editForm: EditFormData | null
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onFormChange: (updates: Partial<EditFormData>) => void
  isSaving: boolean
}

export function PlayerTableRow({
  player,
  isEditing,
  editForm,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleActive,
  onFormChange,
  isSaving,
}: PlayerTableRowProps) {
  const t = useTranslations('admin.players')
  const tCommon = useTranslations('admin.common')

  const getPlayerName = () => {
    return `${player.firstName || ''} ${player.lastName || ''}`.trim() || `Player ${player.id}`
  }

  return (
    <TableRow className="table-row-hover">
      <TableCell>
        {isEditing && editForm ? (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <PlayerForm
                formData={editForm}
                onChange={onFormChange}
                disabled={isSaving}
                mode="inline"
              />
            </div>
            <div className="flex items-center gap-2">
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
                aria-label={tCommon('save')}
              >
                {tCommon('save')}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="font-medium">{getPlayerName()}</div>
            {!player.isActive && (
              <Badge variant="outline" className="mt-1">
                {t('inactive')}
              </Badge>
            )}
          </div>
        )}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {player.position || '-'}
        </span>
      </TableCell>
      <TableCell>
        {player.isActive ? (
          <Badge variant="success">{t('active')}</Badge>
        ) : (
          <Badge variant="secondary">{t('inactive')}</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
            aria-label={t('editPlayer', { name: getPlayerName() })}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleActive}
            aria-label={`Toggle active status: ${getPlayerName()}`}
          >
            {player.isActive ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            aria-label={t('deletePlayer', { name: getPlayerName() })}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
