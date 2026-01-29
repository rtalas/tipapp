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

interface MatchPhaseFormData {
  name: string
  rank: string
  bestOf: string
}

interface MatchPhaseFormProps {
  formData: MatchPhaseFormData
  onChange: (updates: Partial<MatchPhaseFormData>) => void
  disabled?: boolean
  mode: 'inline' | 'dialog'
}

export function MatchPhaseForm({ formData, onChange, disabled = false, mode }: MatchPhaseFormProps) {
  const t = useTranslations('admin.matchPhases')
  const tCommon = useTranslations('admin.common')

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
        {mode === 'dialog' && <label className="text-sm font-medium">{t('form.rankLabel')}</label>}
        <Input
          type="number"
          min="0"
          value={formData.rank}
          onChange={(e) => onChange({ rank: e.target.value })}
          placeholder={t('form.rankPlaceholder')}
          className={inputClassName}
          disabled={disabled}
          aria-label={t('form.rankLabel')}
        />
        {mode === 'dialog' && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('form.rankHint')}
          </p>
        )}
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('form.bestOfLabel')}</label>}
        <Select
          value={formData.bestOf || undefined}
          onValueChange={(value) => onChange({ bestOf: value || '' })}
          disabled={disabled}
        >
          <SelectTrigger className={inputClassName}>
            <SelectValue placeholder={t('bestOf.single')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t('bestOf.option1')}</SelectItem>
            <SelectItem value="3">{t('bestOf.option3')}</SelectItem>
            <SelectItem value="5">{t('bestOf.option5')}</SelectItem>
            <SelectItem value="7">{t('bestOf.option7')}</SelectItem>
          </SelectContent>
        </Select>
        {mode === 'dialog' && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('form.bestOfHint')}
          </p>
        )}
      </div>
    </div>
  )
}
