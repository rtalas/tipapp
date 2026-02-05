import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SPORT_IDS } from '@/lib/constants'

interface SaveButtonProps {
  isSaving: boolean
  isSaved: boolean
  onClick: () => void
  sportId: number
}

export function SaveButton({ isSaving, isSaved, onClick, sportId }: SaveButtonProps) {
  const t = useTranslations('user.matches')
  const sportGradient =
    sportId === SPORT_IDS.HOCKEY ? 'gradient-hockey' : 'gradient-football'

  return (
    <Button
      className={cn(
        'w-full mt-4',
        isSaved ? 'bg-primary/20 text-primary hover:bg-primary/30' : sportGradient
      )}
      size="sm"
      disabled={isSaving}
      onClick={onClick}
    >
      {isSaving ? (
        <span className="animate-pulse">{t('saving')}</span>
      ) : isSaved ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          {t('saved')}
        </>
      ) : (
        <>
          <Check className="w-4 h-4 mr-2" />
          {t('savePrediction')}
        </>
      )}
    </Button>
  )
}
