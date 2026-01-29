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

interface TeamFormData {
  name: string
  nickname: string
  shortcut: string
  sportId: string
  flagIcon: string
  flagType: string
  externalId?: string
}

interface TeamFormProps {
  formData: TeamFormData
  onChange: (updates: Partial<TeamFormData>) => void
  sports: Sport[]
  disabled?: boolean
  mode: 'inline' | 'dialog'
}

export function TeamForm({ formData, onChange, sports, disabled = false, mode }: TeamFormProps) {
  const t = useTranslations('admin.teams')
  const tCommon = useTranslations('admin.common')

  const inputClassName = mode === 'inline' ? 'h-8' : ''

  return (
    <div className={mode === 'inline' ? 'space-y-2' : 'space-y-4'}>
      {mode === 'dialog' && (
        <div>
          <label className="text-sm font-medium">{t('sport')}</label>
          <Select
            value={formData.sportId}
            onValueChange={(value) => onChange({ sportId: value })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectSport')} />
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
      )}

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{tCommon('name')}</label>}
        <Input
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={mode === 'dialog' ? t('nameExample') : t('teamName')}
          className={inputClassName}
          disabled={disabled}
          autoFocus={mode === 'inline'}
          aria-label={t('teamName')}
        />
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('nickname')}</label>}
        <Input
          type="text"
          value={formData.nickname}
          onChange={(e) => onChange({ nickname: e.target.value })}
          placeholder={mode === 'dialog' ? t('nicknameExample') : t('nicknameOptional')}
          className={inputClassName}
          disabled={disabled}
          aria-label={t('nickname')}
        />
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('shortcut')}</label>}
        <Input
          type="text"
          value={formData.shortcut}
          onChange={(e) => onChange({ shortcut: e.target.value })}
          placeholder={mode === 'dialog' ? t('shortcutExample') : t('shortcut')}
          className={inputClassName}
          disabled={disabled}
          aria-label={t('teamShortcut')}
        />
      </div>

      {mode === 'inline' && (
        <Select
          value={formData.sportId}
          onValueChange={(value) => onChange({ sportId: value })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8" aria-label={t('teamSport')}>
            <SelectValue placeholder={t('selectSport')} />
          </SelectTrigger>
          <SelectContent>
            {sports.map((sport) => (
              <SelectItem key={sport.id} value={sport.id.toString()}>
                {sport.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('flagType')}</label>}
        <Select
          value={formData.flagType}
          onValueChange={(value) => onChange({ flagType: value })}
          disabled={disabled}
        >
          <SelectTrigger className={inputClassName} aria-label={t('flagType')}>
            <SelectValue placeholder={t('selectFlagType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('flagTypeNone')}</SelectItem>
            <SelectItem value="icon">
              {mode === 'dialog' ? t('flagTypeIconNational') : t('flagTypeIcon')}
            </SelectItem>
            <SelectItem value="path">
              {mode === 'dialog' ? t('flagTypePathLogo') : t('flagTypePath')}
            </SelectItem>
          </SelectContent>
        </Select>
        {mode === 'dialog' && (
          <p className="text-xs text-muted-foreground mt-1">
            {t('chooseFlagType')}
          </p>
        )}
      </div>

      <div>
        {mode === 'dialog' && <label className="text-sm font-medium">{t('flagIconPath')}</label>}
        <Input
          type="text"
          value={formData.flagIcon}
          onChange={(e) => onChange({ flagIcon: e.target.value })}
          placeholder={formData.flagType === 'path' ? t('flagIconPathPlaceholder') : t('flagIconPlaceholder')}
          className={inputClassName}
          disabled={disabled}
          aria-label={t('flagIconPath')}
        />
        {mode === 'dialog' && (
          <p className="text-xs text-muted-foreground mt-1">
            {formData.flagType === 'path' ? t('flagPathHelp') : t('flagIconHelp')}
          </p>
        )}
      </div>

      {mode === 'dialog' && formData.externalId !== undefined && (
        <div>
          <label className="text-sm font-medium">{t('externalId')}</label>
          <Input
            type="number"
            placeholder={t('externalIdOptional')}
            value={formData.externalId}
            onChange={(e) => onChange({ externalId: e.target.value })}
            aria-label={t('externalId')}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
