'use client'

import { useTranslations } from 'next-intl'
import { useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { Trash2, Reply } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/common/user-avatar'
import type { ChatMessage } from '@/hooks/useMessages'
import { getUserDisplayName } from '@/lib/user-display-utils'

const SWIPE_THRESHOLD = 60
const MAX_SWIPE = 80

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  canDelete: boolean
  onDelete: (id: number) => void
  onReply: (message: ChatMessage) => void
  onScrollToOriginal: (messageId: number) => void
}

export function MessageBubble({ message, isOwn, canDelete, onDelete, onReply, onScrollToOriginal }: MessageBubbleProps) {
  const t = useTranslations('user.chat')
  const user = message.LeagueUser.User
  const displayName = getUserDisplayName(user)

  const replyTo = message.ReplyTo
  const replyAuthor = replyTo?.LeagueUser.User
  const replyAuthorName = replyAuthor ? getUserDisplayName(replyAuthor) : null
  const isReplyDeleted = replyTo?.deletedAt !== null && replyTo?.deletedAt !== undefined

  // Swipe-to-reply state
  const rowRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const swiping = useRef(false)
  const locked = useRef(false) // true once we decide horizontal vs vertical

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    swiping.current = false
    locked.current = false
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Decide direction on first significant move
    if (!locked.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      locked.current = true
      // If vertical scroll dominates, bail out
      if (Math.abs(dy) > Math.abs(dx)) return
      swiping.current = true
    }

    if (!swiping.current) return

    // Only allow swiping right
    const offset = Math.min(Math.max(dx, 0), MAX_SWIPE)
    if (offset > 0) {
      e.preventDefault() // prevent scroll while swiping horizontally
    }

    const row = rowRef.current
    const icon = iconRef.current
    if (row) {
      row.style.transform = `translateX(${offset}px)`
      row.style.transition = 'none'
    }
    if (icon) {
      const progress = Math.min(offset / SWIPE_THRESHOLD, 1)
      icon.style.opacity = `${progress}`
      icon.style.transform = `scale(${0.5 + progress * 0.5})`
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    const row = rowRef.current
    const icon = iconRef.current

    if (row) {
      // Check if we passed threshold before resetting
      const currentX = parseFloat(row.style.transform.replace('translateX(', '').replace('px)', '')) || 0
      if (swiping.current && currentX >= SWIPE_THRESHOLD) {
        onReply(message)
      }
      row.style.transition = 'transform 0.2s ease-out'
      row.style.transform = 'translateX(0)'
    }
    if (icon) {
      icon.style.opacity = '0'
      icon.style.transform = 'scale(0.5)'
    }

    swiping.current = false
    locked.current = false
  }, [message, onReply])

  return (
    <div className="relative overflow-hidden">
      {/* Reply icon revealed behind message on swipe */}
      <div
        ref={iconRef}
        className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity"
        style={{ transform: 'scale(0.5)' }}
      >
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <Reply className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Swipeable row */}
      <div
        ref={rowRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={cn(
          'flex gap-2 group',
          isOwn ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {/* Avatar */}
        <UserAvatar
          avatarUrl={user.avatarUrl}
          firstName={user.firstName}
          lastName={user.lastName}
          username={user.username}
          size="sm"
        />

        {/* Message content */}
        <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
          {/* Name and time */}
          <div
            className={cn(
              'flex items-center gap-2 text-xs text-muted-foreground mb-1',
              isOwn ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <span className="font-medium">{isOwn ? t('you') : displayName}</span>
            <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          </div>

          {/* Bubble + reply icon side by side */}
          <div className={cn('flex items-center gap-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
            <div
              className={cn(
                'rounded-2xl px-4 py-2 break-words',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm'
              )}
            >
              {/* Reply preview inside bubble */}
              {replyTo && (
                <button
                  type="button"
                  onClick={() => !isReplyDeleted && onScrollToOriginal(replyTo.id)}
                  disabled={isReplyDeleted}
                  aria-label={isReplyDeleted ? t('messageDeleted') : t('scrollToOriginal')}
                  className={cn(
                    'w-full text-left mb-2 rounded-lg px-3 py-1.5 text-xs border-l-2',
                    isOwn
                      ? 'bg-primary-foreground/15 border-primary-foreground/40'
                      : 'bg-background/50 border-foreground/30',
                    isReplyDeleted ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-80'
                  )}
                >
                  <span className={cn(
                    'font-semibold block',
                    isOwn ? 'text-primary-foreground/80' : 'text-foreground/70'
                  )}>
                    {replyAuthorName}
                  </span>
                  <span className={cn(
                    'line-clamp-2',
                    isOwn ? 'text-primary-foreground/60' : 'text-foreground/50',
                    isReplyDeleted && 'italic'
                  )}>
                    {isReplyDeleted ? t('messageDeleted') : replyTo.text}
                  </span>
                </button>
              )}

              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>

            {/* Reply button next to bubble (desktop hover) */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hidden sm:flex"
              onClick={() => onReply(message)}
              aria-label={t('reply')}
            >
              <Reply className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>

          {/* Delete button (shown on hover, below bubble) */}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
              onClick={() => onDelete(message.id)}
              aria-label={t('deleteMessage')}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
