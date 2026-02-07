import { useTranslations } from 'next-intl'
import { Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import type { ScorerRankedConfig, GroupStageConfig, ExactPlayerConfig } from '@/lib/evaluators/types'

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
  config: unknown
  EvaluatorType: EvaluatorType
  League: League
}

interface EvaluatorTableRowProps {
  evaluator: Evaluator
  showLeague: boolean
  isEditing: boolean
  editNameValue: string
  editPointsValue: string
  isSaving: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: () => void
  onNameChange: (value: string) => void
  onPointsChange: (value: string) => void
}

export function EvaluatorTableRow({
  evaluator,
  showLeague,
  isEditing,
  editNameValue,
  editPointsValue,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onNameChange,
  onPointsChange,
}: EvaluatorTableRowProps) {
  const tCommon = useTranslations('admin.common')

  return (
    <TableRow className="table-row-hover">
      {showLeague && (
        <TableCell>
          <Badge variant="secondary">{evaluator.League.name}</Badge>
        </TableCell>
      )}
      <TableCell>
        {isEditing ? (
          <Input
            type="text"
            value={editNameValue}
            onChange={(e) => onNameChange(e.target.value)}
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
        {isEditing ? (
          <Input
            type="number"
            min="0"
            value={editPointsValue}
            onChange={(e) => onPointsChange(e.target.value)}
            className="w-20 h-8 text-center mx-auto"
            disabled={isSaving}
            aria-label="Points value"
          />
        ) : (
          <PointsDisplay evaluator={evaluator} />
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onCancelEdit}
                disabled={isSaving}
                aria-label="Cancel editing"
              >
                {tCommon('button.cancel')}
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={onSave}
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
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function PointsDisplay({ evaluator }: { evaluator: Evaluator }) {
  if (evaluator.config && evaluator.EvaluatorType.name === 'scorer') {
    const config = evaluator.config as ScorerRankedConfig
    return (
      <span className="text-xs font-mono">
        {Object.entries(config.rankedPoints)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([rank, pts]) => `R${rank}:${pts}`)
          .join(' ') + ` U:${config.unrankedPoints}`}
      </span>
    )
  }

  if (evaluator.config && evaluator.EvaluatorType.name === 'group_stage_team') {
    const config = evaluator.config as GroupStageConfig
    return (
      <span className="text-xs font-mono">
        W:{config.winnerPoints} A:{config.advancePoints}
      </span>
    )
  }

  if (
    evaluator.config &&
    typeof evaluator.config === 'object' &&
    evaluator.config !== null &&
    evaluator.EvaluatorType.name === 'exact_player' &&
    'positions' in evaluator.config
  ) {
    const config = evaluator.config as ExactPlayerConfig
    return (
      <div className="text-xs">
        <span className="font-mono font-bold">{evaluator.points}</span>
        {config.positions && config.positions.length > 0 && (
          <div className="text-muted-foreground mt-0.5">
            Pos: {config.positions.join(', ')}
          </div>
        )}
      </div>
    )
  }

  return <span className="font-mono font-bold">{evaluator.points}</span>
}
