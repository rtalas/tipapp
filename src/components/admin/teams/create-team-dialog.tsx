import React from 'react'
import { useTranslations } from 'next-intl'
import { TeamForm } from './team-form'
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

interface CreateFormData {
  sportId: string
  name: string
  nickname: string
  shortcut: string
  flagIcon: string
  flagType: string
  externalId: string
}

interface CreateTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateFormData
  onFormChange: (updates: Partial<CreateFormData>) => void
  onCreate: () => Promise<void>
  isCreating: boolean
  sports: Sport[]
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onCreate,
  isCreating,
  sports,
}: CreateTeamDialogProps) {
  const t = useTranslations('admin.teams')
  const tCommon = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createDescription')}</DialogDescription>
        </DialogHeader>

        <TeamForm
          formData={formData}
          onChange={onFormChange}
          sports={sports}
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
