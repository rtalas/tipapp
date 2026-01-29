import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ScorerRankedConfig } from '@/lib/evaluators/types'

interface EvaluatorType {
  id: number
  name: string
}

interface EvaluatorFormData {
  evaluatorTypeId: string
  name: string
  points: string
  config?: ScorerRankedConfig | null
}

interface EvaluatorFormProps {
  formData: EvaluatorFormData
  onChange: (updates: Partial<EvaluatorFormData>) => void
  evaluatorTypes: EvaluatorType[]
  disabled?: boolean
  mode: 'inline' | 'dialog'
}

export function EvaluatorForm({
  formData,
  onChange,
  evaluatorTypes,
  disabled = false,
  mode
}: EvaluatorFormProps) {
  const t = useTranslations('admin.leagueEvaluators')

  const inputClassName = mode === 'inline' ? 'h-8' : ''

  // Check if this is a scorer evaluator
  const selectedType = evaluatorTypes.find(
    (type) => type.id.toString() === formData.evaluatorTypeId
  )
  const isScorer = selectedType?.name === 'scorer'

  // Show config UI for scorer evaluators (even if config doesn't exist yet in inline mode)
  const hasConfig = isScorer && formData.config && mode === 'inline'

  const handleAddRank = () => {
    if (!formData.config) return

    const existingRanks = Object.keys(formData.config.rankedPoints).map(Number)
    const nextRank = existingRanks.length > 0 ? Math.max(...existingRanks) + 1 : 1

    onChange({
      config: {
        ...formData.config,
        rankedPoints: {
          ...formData.config.rankedPoints,
          [nextRank.toString()]: 0,
        },
      },
    })
  }

  const handleRemoveRank = (rank: string) => {
    if (!formData.config) return

    const newRankedPoints = { ...formData.config.rankedPoints }
    delete newRankedPoints[rank]

    onChange({
      config: {
        ...formData.config,
        rankedPoints: newRankedPoints,
      },
    })
  }

  const handleRankPointsChange = (rank: string, points: string) => {
    if (!formData.config) return

    const pointsNum = parseInt(points, 10)
    if (isNaN(pointsNum)) return

    onChange({
      config: {
        ...formData.config,
        rankedPoints: {
          ...formData.config.rankedPoints,
          [rank]: pointsNum,
        },
      },
    })
  }

  const handleUnrankedPointsChange = (points: string) => {
    if (!formData.config) return

    const pointsNum = parseInt(points, 10)
    if (isNaN(pointsNum)) return

    onChange({
      config: {
        ...formData.config,
        unrankedPoints: pointsNum,
      },
    })
  }

  return (
    <div className={mode === 'inline' ? 'space-y-2' : 'space-y-4'}>
      {mode === 'dialog' && (
        <div>
          <label className="text-sm font-medium">{t('evaluatorType')}</label>
          <Select
            value={formData.evaluatorTypeId}
            onValueChange={(value) => onChange({ evaluatorTypeId: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectType')} />
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
      )}

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('evaluatorName')}</label>}
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={mode === 'dialog' ? t('nameExample') : t('ruleName')}
          className={inputClassName}
          disabled={disabled}
          autoFocus={mode === 'inline'}
          aria-label="Evaluator name"
        />
      </div>

      {/* Show ranked config for scorer, otherwise show simple points */}
      {hasConfig && formData.config ? (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Ranking Points</label>
            <div className="space-y-2 mt-2">
              {Object.entries(formData.config.rankedPoints)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([rank, points]) => (
                  <div key={rank} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-16">Rank {rank}:</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={points}
                      onChange={(e) => handleRankPointsChange(rank, e.target.value)}
                      className="w-20 h-8"
                      disabled={disabled}
                      aria-label={`Points for rank ${rank}`}
                    />
                    <span className="text-sm text-muted-foreground">pts</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRank(rank)}
                      disabled={disabled || Object.keys(formData.config!.rankedPoints).length === 1}
                      aria-label={`Remove rank ${rank}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRank}
                disabled={disabled}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Rank
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Unranked Points</label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.config.unrankedPoints}
                onChange={(e) => handleUnrankedPointsChange(e.target.value)}
                className="w-20 h-8"
                disabled={disabled}
                aria-label="Points for unranked scorers"
              />
              <span className="text-sm text-muted-foreground">pts for unranked scorers</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {mode === 'dialog' && <label className="text-sm font-medium">{t('pointsLabel')}</label>}
          <Input
            type="number"
            min="0"
            value={formData.points}
            onChange={(e) => onChange({ points: e.target.value })}
            placeholder={mode === 'dialog' ? t('pointsExample') : t('points')}
            className={mode === 'inline' ? 'w-16 h-8 text-center' : ''}
            disabled={disabled}
            aria-label="Points value"
          />
        </div>
      )}
    </div>
  )
}
