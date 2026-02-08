'use client'

import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUserLeagueContext } from '@/contexts/user-league-context'
import { LeagueSelectionDialog } from './league-selection-dialog'
import { UserMenuDropdown } from './user-menu-dropdown'
import { LanguageSwitcher } from './language-switcher'
import { DemoBanner } from '@/components/demo-banner'
import { SPORT_IDS } from '@/lib/constants'

interface HeaderProps {
  user: {
    id: string
    username: string
    firstName?: string | null
    lastName?: string | null
    avatarUrl?: string | null
    isSuperadmin?: boolean
  }
  currentLeague: {
    id: number
    name: string
    seasonFrom: number
    seasonTo: number
    infoText: string | null
    sport: {
      id: number
      name: string
    }
  }
  locale?: string
}

// Helper to get sport emoji
function getSportEmoji(sportId?: number): string {
  switch (sportId) {
    case SPORT_IDS.HOCKEY:
      return '🏒'
    case SPORT_IDS.FOOTBALL:
      return '⚽'
    default:
      return '🏆'
  }
}

export function Header({ user, currentLeague, locale }: HeaderProps) {
  const t = useTranslations('user.header')
  const { setSelectedLeagueId } = useUserLeagueContext()
  const [showLeagueDialog, setShowLeagueDialog] = useState(false)
  const [showLanguageDialog, setShowLanguageDialog] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)

  const handleLeagueSelect = (leagueId: number) => {
    setSelectedLeagueId(leagueId)
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 glass-card border-b-0 rounded-b-2xl">
        <div className="flex h-14 items-center justify-between px-4 max-w-2xl mx-auto">
          {/* Left side: League selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowLeagueDialog(true)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-secondary/50 active:bg-secondary"
              aria-label={t('selectLeague')}
            >
              <span className="text-lg">
                {getSportEmoji(currentLeague.sport?.id)}
              </span>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm leading-tight">
                  {currentLeague.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {currentLeague.seasonFrom}/{currentLeague.seasonTo}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
            </button>
            {currentLeague?.infoText && (
              <button
                onClick={() => setShowInfoDialog(true)}
                className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
                aria-label={t('leagueInfo')}
              >
                <Info className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Right side: User menu */}
          <div className="flex items-center">
            <UserMenuDropdown
              user={user}
              currentLeagueId={currentLeague.id}
              onLanguageClick={() => setShowLanguageDialog(true)}
            />
          </div>
        </div>
      </header>

      <DemoBanner variant="user" />

      {/* League Selection Dialog */}
      <LeagueSelectionDialog
        open={showLeagueDialog}
        onOpenChange={setShowLeagueDialog}
        selectedLeagueId={currentLeague.id}
        onLeagueSelect={handleLeagueSelect}
      />

      {/* Language Switcher Dialog */}
      <LanguageSwitcher
        currentLocale={locale || 'en'}
        open={showLanguageDialog}
        onOpenChange={setShowLanguageDialog}
      />

      {/* League Info Dialog */}
      {currentLeague?.infoText && (
        <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {currentLeague.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {t('leagueInfoDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm whitespace-pre-wrap">{currentLeague.infoText}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
