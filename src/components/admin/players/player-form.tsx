import React from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'

interface PlayerFormData {
  firstName: string
  lastName: string
  position: string
  isActive?: boolean
  externalId?: string
}

interface PlayerFormProps {
  formData: PlayerFormData
  onChange: (updates: Partial<PlayerFormData>) => void
  disabled?: boolean
  mode: 'inline' | 'dialog'
}

export function PlayerForm({ formData, onChange, disabled = false, mode }: PlayerFormProps) {
  const t = useTranslations('admin.players')

  const inputClassName = mode === 'inline' ? 'h-8' : ''

  return (
    <div className={mode === 'inline' ? 'space-y-2' : 'space-y-4'}>
      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('firstName')}</label>}
        <Input
          type="text"
          value={formData.firstName}
          onChange={(e) => onChange({ firstName: e.target.value })}
          placeholder={mode === 'dialog' ? 'e.g., Cristiano' : t('firstName')}
          className={inputClassName}
          disabled={disabled}
          autoFocus={mode === 'inline'}
          aria-label={t('firstName')}
        />
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('lastName')}</label>}
        <Input
          type="text"
          value={formData.lastName}
          onChange={(e) => onChange({ lastName: e.target.value })}
          placeholder={mode === 'dialog' ? 'e.g., Ronaldo' : t('lastName')}
          className={inputClassName}
          disabled={disabled}
          aria-label={t('lastName')}
        />
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('position')}</label>}
        <Input
          type="text"
          value={formData.position}
          onChange={(e) => onChange({ position: e.target.value })}
          placeholder={mode === 'dialog' ? 'e.g., Forward' : t('positionOptional')}
          className={inputClassName}
          disabled={disabled}
          aria-label={t('position')}
        />
      </div>

      {mode === 'dialog' && formData.externalId !== undefined && (
        <div>
          <label className="text-sm font-medium">External ID</label>
          <Input
            type="number"
            placeholder="Optional external ID"
            value={formData.externalId}
            onChange={(e) => onChange({ externalId: e.target.value })}
            aria-label="External ID"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
