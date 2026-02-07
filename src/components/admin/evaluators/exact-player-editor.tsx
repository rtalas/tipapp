import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { TableCell, TableRow } from '@/components/ui/table'
import type { ExactPlayerConfig } from '@/lib/evaluators/types'

interface ExactPlayerEditorProps {
  colSpan: number
  editNameValue: string
  editPointsValue: string
  editConfig: ExactPlayerConfig
  availablePositions: { value: string; label: string }[]
  isSaving: boolean
  onNameChange: (value: string) => void
  onPointsChange: (value: string) => void
  onConfigChange: (config: ExactPlayerConfig) => void
  onCancel: () => void
  onSave: () => void
}

export function ExactPlayerEditor({
  colSpan,
  editNameValue,
  editPointsValue,
  editConfig,
  availablePositions,
  isSaving,
  onNameChange,
  onPointsChange,
  onConfigChange,
  onCancel,
  onSave,
}: ExactPlayerEditorProps) {
  const tCommon = useTranslations('admin.common')

  return (
    <TableRow className="table-row-hover">
      <TableCell colSpan={colSpan} className="p-4">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Rule Name</Label>
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
            <Label className="text-sm font-medium">Points</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={editPointsValue}
              onChange={(e) => onPointsChange(e.target.value)}
              className="w-20 h-8 mt-1"
              disabled={isSaving}
              aria-label="Points value"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Position Filter (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Select positions to filter which players can be selected for this bet
            </p>
            <div className="space-y-2">
              {availablePositions.map((position) => {
                const isChecked = editConfig.positions?.includes(position.value) ?? false
                return (
                  <div key={position.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-position-${position.value}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const currentPositions = editConfig.positions || []
                        if (checked) {
                          onConfigChange({ positions: [...currentPositions, position.value] })
                        } else {
                          const newPositions = currentPositions.filter(p => p !== position.value)
                          onConfigChange({ positions: newPositions.length > 0 ? newPositions : null })
                        }
                      }}
                      disabled={isSaving}
                    />
                    <Label
                      htmlFor={`edit-position-${position.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {position.label} ({position.value})
                    </Label>
                  </div>
                )
              })}
            </div>
            {(!editConfig.positions || editConfig.positions.length === 0) && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                No positions selected - all players will be available for this bet
              </p>
            )}
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
