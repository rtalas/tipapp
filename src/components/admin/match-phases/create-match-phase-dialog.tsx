import React from 'react'
import { useTranslations } from 'next-intl'
import { MatchPhaseForm } from './match-phase-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CreateFormData {
  name: string
  rank: string
  bestOf: string
}

interface CreateMatchPhaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateFormData
  onFormChange: (updates: Partial<CreateFormData>) => void
  onCreate: () => Promise<void>
  isCreating: boolean
}

export function CreateMatchPhaseDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onCreate,
  isCreating,
}: CreateMatchPhaseDialogProps) {
  const t = useTranslations('admin.matchPhases')
  const tCommon = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.createTitle')}</DialogTitle>
          <DialogDescription>{t('dialog.createDescription')}</DialogDescription>
        </DialogHeader>

        <MatchPhaseForm
          formData={formData}
          onChange={onFormChange}
          disabled={isCreating}
          mode="dialog"
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            {tCommon('button.cancel')}
          </Button>
          <Button onClick={onCreate} disabled={isCreating}>
            {isCreating ? t('dialog.creating') : t('dialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
