import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreEntryForm } from './score-entry-form'
import { SPORT_IDS } from '@/lib/constants'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const teams = {
  homeTeam: { Team: { id: 1, name: 'Home FC', shortcut: 'HOM' } },
  awayTeam: { Team: { id: 2, name: 'Away FC', shortcut: 'AWY' } },
}

function renderForm(overrides: {
  sportId?: number
  isPlayoffGame?: boolean
  isOvertime?: boolean
  isShootout?: boolean
} = {}) {
  return render(
    <ScoreEntryForm
      homeTeam={teams.homeTeam}
      awayTeam={teams.awayTeam}
      sportId={overrides.sportId ?? SPORT_IDS.HOCKEY}
      isPlayoffGame={overrides.isPlayoffGame ?? false}
      homeRegularScore=""
      awayRegularScore=""
      homeFinalScore=""
      awayFinalScore=""
      isOvertime={overrides.isOvertime ?? false}
      isShootout={overrides.isShootout ?? false}
      onHomeRegularScoreChange={vi.fn()}
      onAwayRegularScoreChange={vi.fn()}
      onHomeFinalScoreChange={vi.fn()}
      onAwayFinalScoreChange={vi.fn()}
      onOvertimeChange={vi.fn()}
      onShootoutChange={vi.fn()}
    />
  )
}

describe('ScoreEntryForm', () => {
  describe('hockey (any phase)', () => {
    it('shows overtime + shootout checkboxes with hockey labels', () => {
      renderForm({ sportId: SPORT_IDS.HOCKEY })
      expect(screen.getByText('overtime')).toBeInTheDocument()
      expect(screen.getByText('shootout')).toBeInTheDocument()
      expect(screen.queryByText('extraTime')).not.toBeInTheDocument()
      expect(screen.queryByText('penaltyShootout')).not.toBeInTheDocument()
    })

    it('shows final-score block with hockey label when overtime is on', () => {
      renderForm({ sportId: SPORT_IDS.HOCKEY, isOvertime: true })
      expect(screen.getByText('afterOvertime')).toBeInTheDocument()
      expect(screen.queryByText('afterExtraTime')).not.toBeInTheDocument()
    })
  })

  describe('football group stage', () => {
    it('hides overtime and shootout checkboxes', () => {
      renderForm({ sportId: SPORT_IDS.FOOTBALL, isPlayoffGame: false })
      expect(screen.queryByText('overtime')).not.toBeInTheDocument()
      expect(screen.queryByText('shootout')).not.toBeInTheDocument()
      expect(screen.queryByText('extraTime')).not.toBeInTheDocument()
      expect(screen.queryByText('penaltyShootout')).not.toBeInTheDocument()
    })

    it('shows only final-score input (no after-extra-time block)', () => {
      renderForm({ sportId: SPORT_IDS.FOOTBALL, isPlayoffGame: false })
      expect(screen.getByText('finalScore')).toBeInTheDocument()
      expect(screen.queryByText('regularTimeScore')).not.toBeInTheDocument()
      expect(screen.queryByText('afterExtraTime')).not.toBeInTheDocument()
    })
  })

  describe('football playoff', () => {
    it('shows extra-time + penalty-shootout labels (not hockey ones)', () => {
      renderForm({ sportId: SPORT_IDS.FOOTBALL, isPlayoffGame: true })
      expect(screen.getByText('extraTime')).toBeInTheDocument()
      expect(screen.getByText('penaltyShootout')).toBeInTheDocument()
      expect(screen.queryByText('overtime')).not.toBeInTheDocument()
      expect(screen.queryByText('shootout')).not.toBeInTheDocument()
    })

    it('shows after-extra-time block when extra time is on', () => {
      renderForm({ sportId: SPORT_IDS.FOOTBALL, isPlayoffGame: true, isOvertime: true })
      expect(screen.getByText('afterExtraTime')).toBeInTheDocument()
      expect(screen.queryByText('afterOvertime')).not.toBeInTheDocument()
    })

    it('switches regulation-score label when extra time is on', () => {
      renderForm({ sportId: SPORT_IDS.FOOTBALL, isPlayoffGame: true, isOvertime: true })
      expect(screen.getByText('regularTimeScore')).toBeInTheDocument()
      expect(screen.queryByText('finalScore')).not.toBeInTheDocument()
    })
  })
})
