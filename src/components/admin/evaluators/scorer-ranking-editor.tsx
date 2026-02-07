import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import type { ScorerRankedConfig } from '@/lib/evaluators/types'

interface ScorerRankingEditorProps {
  colSpan: number
  editNameValue: string
  editConfig: ScorerRankedConfig
  isSaving: boolean
  onNameChange: (value: string) => void
  onConfigChange: (config: ScorerRankedConfig) => void
  onCancel: () => void
  onSave: () => void
}

export function ScorerRankingEditor({
  colSpan,
  editNameValue,
  editConfig,
  isSaving,
  onNameChange,
  onConfigChange,
  onCancel,
  onSave,
}: ScorerRankingEditorProps) {
  const t = useTranslations('admin.evaluators')
  const tCommon = useTranslations('admin.common')

  const handleAddRank = () => {
    const existingRanks = Object.keys(editConfig.rankedPoints).map(Number)
    const nextRank = existingRanks.length > 0 ? Math.max(...existingRanks) + 1 : 1
    onConfigChange({
      ...editConfig,
      rankedPoints: {
        ...editConfig.rankedPoints,
        [nextRank.toString()]: 0,
      },
    })
  }

  const handleRemoveRank = (rank: string) => {
    if (Object.keys(editConfig.rankedPoints).length <= 1) return
    const newRankedPoints = { ...editConfig.rankedPoints }
    delete newRankedPoints[rank]
    onConfigChange({ ...editConfig, rankedPoints: newRankedPoints })
  }

  const handleRankPointsChange = (rank: string, value: string) => {
    const val = parseInt(value, 10)
    if (isNaN(val)) return
    onConfigChange({
      ...editConfig,
      rankedPoints: { ...editConfig.rankedPoints, [rank]: val },
    })
  }

  const handleUnrankedPointsChange = (value: string) => {
    const val = parseInt(value, 10)
    if (isNaN(val)) return
    onConfigChange({ ...editConfig, unrankedPoints: val })
  }

  return (
    <TableRow className="table-row-hover">
      <TableCell colSpan={colSpan} className="p-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Rule Name</label>
            <Input
              type="text"
              value={editNameValue}
              onChange={(e) => onNameChange(e.target.value)}
              className="h-8 mt-1"
              disabled={isSaving}
              aria-label="Evaluator name"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('rankingPoints')}</label>
            <div className="space-y-2 mt-2">
              {Object.entries(editConfig.rankedPoints)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([rank, points]) => (
                  <div key={rank} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-16">{t('rank', { rank })}</span>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={points}
                      onChange={(e) => handleRankPointsChange(rank, e.target.value)}
                      className="w-20 h-8"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-muted-foreground">{t('pts')}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRank(rank)}
                      disabled={isSaving || Object.keys(editConfig.rankedPoints).length === 1}
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
                disabled={isSaving}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('addRank')}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">{t('unrankedPoints')}</label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={editConfig.unrankedPoints}
                onChange={(e) => handleUnrankedPointsChange(e.target.value)}
                className="w-20 h-8"
                disabled={isSaving}
              />
              <span className="text-sm text-muted-foreground">{t('ptsForUnranked')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onCancel} disabled={isSaving}>
              {tCommon('cancel')}
            </Button>
            <Button size="sm" variant="default" onClick={onSave} disabled={isSaving}>
              {tCommon('save')}
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
