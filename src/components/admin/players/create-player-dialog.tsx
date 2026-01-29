import React from 'react'
import { useTranslations } from 'next-intl'
import { PlayerForm } from './player-form'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CreateFormData {
  firstName: string
  lastName: string
  position: string
  isActive: boolean
  externalId: string
}

interface CreatePlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: CreateFormData
  onFormChange: (updates: Partial<CreateFormData>) => void
  onCreate: () => Promise<void>
  isCreating: boolean
}

export function CreatePlayerDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onCreate,
  isCreating,
}: CreatePlayerDialogProps) {
  const t = useTranslations('admin.players')
  const tCommon = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createTitle')}</DialogTitle>
          <DialogDescription>{t('createDescription')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <PlayerForm
            formData={formData}
            onChange={onFormChange}
            disabled={isCreating}
            mode="dialog"
          />

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t('active')}</label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                onFormChange({ isActive: checked })
              }
              aria-label={t('active')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            {tCommon('cancel')}
          </Button>
          <Button onClick={onCreate} disabled={isCreating}>
            {isCreating ? tCommon('creating') : tCommon('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
