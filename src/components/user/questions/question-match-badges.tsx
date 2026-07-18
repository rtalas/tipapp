import { TeamFlag } from '@/components/common/team-flag'
import type { UserQuestion } from '@/actions/user/questions'

interface QuestionMatchBadgesProps {
  matches: UserQuestion['matches']
}

/**
 * Compact chips listing the matches a daily question covers (its hrací den).
 * Shows team shortcut + flag when teams are known, otherwise the placeholder.
 */
export function QuestionMatchBadges({ matches }: QuestionMatchBadgesProps) {
  if (!matches || matches.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {matches.map((m, i) => {
        const homeLabel = m.home?.shortcut || m.home?.name || m.homePlaceholder || '?'
        const awayLabel = m.away?.shortcut || m.away?.name || m.awayPlaceholder || '?'
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
          >
            {m.phase ? (
              <span
                className="inline-flex items-center justify-center h-[14px] px-1 rounded-sm bg-primary/15 text-primary text-[9px] font-bold uppercase leading-none"
                title={m.phase}
              >
                {m.phase}
              </span>
            ) : (
              m.group && (
                <span
                  className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-sm bg-primary/15 text-primary text-[9px] font-bold leading-none"
                  title={`Skupina ${m.group}`}
                >
                  {m.group}
                </span>
              )
            )}
            {m.home && (
              <TeamFlag
                flagIcon={m.home.flagIcon}
                flagType={m.home.flagType}
                teamName={homeLabel}
                size="xs"
              />
            )}
            <span>{homeLabel}</span>
            <span className="opacity-50">–</span>
            <span>{awayLabel}</span>
            {m.away && (
              <TeamFlag
                flagIcon={m.away.flagIcon}
                flagType={m.away.flagType}
                teamName={awayLabel}
                size="xs"
              />
            )}
          </span>
        )
      })}
    </div>
  )
}
