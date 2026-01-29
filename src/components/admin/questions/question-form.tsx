import React from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface QuestionFormData {
  text: string
  dateTime: string
}

interface QuestionFormProps {
  formData: QuestionFormData
  onChange: (updates: Partial<QuestionFormData>) => void
  disabled?: boolean
  mode: 'inline' | 'dialog'
}

export function QuestionForm({ formData, onChange, disabled = false, mode }: QuestionFormProps) {
  const t = useTranslations('admin.questions')

  const inputClassName = mode === 'inline' ? 'h-8' : ''

  return (
    <div className={mode === 'inline' ? 'space-y-2' : 'space-y-4'}>
      <div className="space-y-2">
        {mode === 'dialog' && <Label htmlFor="text">{t('questionText')}</Label>}
        <Textarea
          id="text"
          placeholder={t('questionTextPlaceholder')}
          value={formData.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={mode === 'inline' ? 2 : 4}
          disabled={disabled}
          aria-describedby="text-hint"
          className={mode === 'inline' ? 'text-sm' : ''}
        />
        {mode === 'dialog' && (
          <p id="text-hint" className="text-xs text-muted-foreground">
            {formData.text.length}/500 {t('charactersMinimum')}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {mode === 'dialog' && <Label htmlFor="dateTime">{t('deadlineDateTime')}</Label>}
        <Input
          id="dateTime"
          type="datetime-local"
          value={formData.dateTime}
          onChange={(e) => onChange({ dateTime: e.target.value })}
          className={inputClassName}
          disabled={disabled}
          aria-label={t('deadlineDateTime')}
        />
        {mode === 'dialog' && (
          <p className="text-xs text-muted-foreground">
            {t('deadlineHelp')}
          </p>
        )}
      </div>
    </div>
  )
}
