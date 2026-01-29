import React from 'react'
import { useTranslations } from 'next-intl'
import { SpecialBetTypeForm } from './special-bet-type-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Sport {
  id: number
  name: string
}

interface SpecialBetSingleType {
  id: number
  name: string
}

interface CreateFormData {
  name: string
  sportId: string
  specialBetSingleTypeId: string
}

interface CreateSpecialBetTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateFormData
  onFormChange: (updates: Partial<CreateFormData>) => void
  onCreate: () => Promise<void>
  isCreating: boolean
  sports: Sport[]
  betTypes: SpecialBetSingleType[]
}

export function CreateSpecialBetTypeDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onCreate,
  isCreating,
  sports,
  betTypes,
}: CreateSpecialBetTypeDialogProps) {
  const t = useTranslations('admin.specialBetTypes')
  const tCommon = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialog.createTitle')}</DialogTitle>
          <DialogDescription>{t('dialog.createDescription')}</DialogDescription>
        </DialogHeader>

        <SpecialBetTypeForm
          formData={formData}
          onChange={onFormChange}
          sports={sports}
          betTypes={betTypes}
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
