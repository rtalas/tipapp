import React from 'react'
import { useTranslations } from 'next-intl'
import { QuestionForm } from './question-form'
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
  text: string
  dateTime: string
}

interface CreateQuestionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateFormData
  onFormChange: (updates: Partial<CreateFormData>) => void
  onCreate: () => Promise<void>
  isCreating: boolean
}

export function CreateQuestionDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onCreate,
  isCreating,
}: CreateQuestionDialogProps) {
  const t = useTranslations('admin.questions')
  const tCommon = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createDescription')}</DialogDescription>
        </DialogHeader>

        <QuestionForm
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
            {tCommon('cancel')}
          </Button>
          <Button onClick={onCreate} disabled={isCreating}>
            {isCreating ? t('creating') : tCommon('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
