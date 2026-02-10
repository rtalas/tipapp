'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUserDisplayName } from '@/lib/user-display-utils'
import { UserAvatar } from '@/components/common/user-avatar'
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@/components/ui/dialog'
import type { GroupedReaction } from '@/lib/chat/reaction-utils'

const LONG_PRESS_MS = 400

interface MessageReactionsProps {
  reactions: GroupedReaction[]
  onToggle: (emoji: string) => void
  isOwn: boolean
}

export function MessageReactions({ reactions, onToggle, isOwn }: MessageReactionsProps) {
  const t = useTranslations('user.chat')
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(null)
  const longPressFired = useRef(false)

  if (reactions.length === 0) return null

  const selectedReaction = selectedEmoji ? reactions.find((r) => r.emoji === selectedEmoji) : null

  function handlePointerDown(emoji: string) {
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      setSelectedEmoji(emoji)
    }, LONG_PRESS_MS)
  }

  function handlePointerUp(emoji: string) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (!longPressFired.current) {
      onToggle(emoji)
    }
  }

  function handlePointerCancel() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-1 mt-1', isOwn ? 'justify-end' : 'justify-start')}>
        {reactions.map(({ emoji, count, hasReacted, users }) => (
          <button
            key={emoji}
            type="button"
            onPointerDown={() => handlePointerDown(emoji)}
            onPointerUp={() => handlePointerUp(emoji)}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            title={users.map((u) => getUserDisplayName(u)).join(', ')}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors border select-none touch-none',
              hasReacted
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-muted/50 border-border hover:bg-muted'
            )}
          >
            <span className="text-sm leading-none">{emoji}</span>
            <span className="font-medium">{count}</span>
          </button>
        ))}
      </div>

      <Dialog open={selectedEmoji !== null} onOpenChange={(open) => !open && setSelectedEmoji(null)}>
        <DialogContent className="max-w-xs rounded-2xl p-4">
          <VisuallyHidden>
            <DialogTitle>Reactions</DialogTitle>
          </VisuallyHidden>

          {/* Emoji tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {reactions.map(({ emoji, count }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(emoji)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors border shrink-0',
                  emoji === selectedEmoji
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'bg-muted/50 border-border'
                )}
              >
                <span>{emoji}</span>
                <span className="font-medium">{count}</span>
              </button>
            ))}
          </div>

          {/* Users for selected emoji */}
          {selectedReaction && (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {selectedReaction.users.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <UserAvatar
                    avatarUrl={null}
                    firstName={user.firstName}
                    lastName={user.lastName}
                    username={user.username}
                    size="sm"
                  />
                  <span className="text-sm">{getUserDisplayName(user)}</span>
                </div>
              ))}

              {/* Remove own reaction */}
              {selectedReaction.hasReacted && (
                <button
                  type="button"
                  onClick={() => {
                    onToggle(selectedReaction.emoji)
                    setSelectedEmoji(null)
                  }}
                  className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors mt-3 pt-3 border-t border-border w-full"
                >
                  <X className="h-4 w-4" />
                  {t('removeReaction')}
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
