import React from 'react'
import { useTranslations } from 'next-intl'
import { EvaluatorForm } from './evaluator-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EvaluatorType {
  id: number
  name: string
}

interface CreateEvaluatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: {
    evaluatorTypeId: string
    name: string
    points: string
  }
  onFormChange: (updates: Partial<{
    evaluatorTypeId: string
    name: string
    points: string
  }>) => void
  onCreate: () => void
  isCreating: boolean
  evaluatorTypes: EvaluatorType[]
  leagueName: string
}

export function CreateEvaluatorDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onCreate,
  isCreating,
  evaluatorTypes,
  leagueName,
}: CreateEvaluatorDialogProps) {
  const t = useTranslations('admin.leagueEvaluators')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createDescription', { leagueName })}</DialogDescription>
        </DialogHeader>

        <EvaluatorForm
          formData={formData}
          onChange={onFormChange}
          evaluatorTypes={evaluatorTypes}
          disabled={isCreating}
          mode="dialog"
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
