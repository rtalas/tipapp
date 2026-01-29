import React from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Sport {
  id: number
  name: string
}

interface SpecialBetSingleType {
  id: number
  name: string
}

interface SpecialBetTypeFormData {
  name: string
  sportId: string
  specialBetSingleTypeId: string
}

interface SpecialBetTypeFormProps {
  formData: SpecialBetTypeFormData
  onChange: (updates: Partial<SpecialBetTypeFormData>) => void
  sports: Sport[]
  betTypes: SpecialBetSingleType[]
  disabled?: boolean
  mode: 'inline' | 'dialog'
}

export function SpecialBetTypeForm({
  formData,
  onChange,
  sports,
  betTypes,
  disabled = false,
  mode,
}: SpecialBetTypeFormProps) {
  const t = useTranslations('admin.specialBetTypes')

  const inputClassName = mode === 'inline' ? 'h-8' : ''

  return (
    <div className={mode === 'inline' ? 'space-y-2' : 'space-y-4'}>
      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('form.nameLabel')}</label>}
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={t('form.namePlaceholder')}
          className={inputClassName}
          disabled={disabled}
          autoFocus={mode === 'inline'}
          aria-label={t('form.nameLabel')}
        />
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('form.sportLabel')}</label>}
        <Select
          value={formData.sportId}
          onValueChange={(value) => onChange({ sportId: value })}
          disabled={disabled}
        >
          <SelectTrigger className={inputClassName} aria-label={t('form.sportLabel')}>
            <SelectValue placeholder={t('form.selectSport')} />
          </SelectTrigger>
          <SelectContent>
            {sports.map((sport) => (
              <SelectItem key={sport.id} value={sport.id.toString()}>
                {sport.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('form.typeLabel')}</label>}
        <Select
          value={formData.specialBetSingleTypeId}
          onValueChange={(value) => onChange({ specialBetSingleTypeId: value })}
          disabled={disabled}
        >
          <SelectTrigger className={inputClassName} aria-label={t('form.typeLabel')}>
            <SelectValue placeholder={t('form.selectType')} />
          </SelectTrigger>
          <SelectContent>
            {betTypes.map((type) => (
              <SelectItem key={type.id} value={type.id.toString()}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mode === 'dialog' && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('form.typeHint')}
          </p>
        )}
      </div>
    </div>
  )
}
