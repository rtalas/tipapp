'use client'

import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ChatMessage } from '@/hooks/useMessages'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  canDelete: boolean
  onDelete: (id: number) => void
}

export function MessageBubble({ message, isOwn, canDelete, onDelete }: MessageBubbleProps) {
  const user = message.LeagueUser.User
  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.username

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.username.slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        'flex gap-2 group',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
          isOwn
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
        title={displayName}
      >
        {initials}
      </div>

      {/* Message content */}
      <div className={cn('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {/* Name and time */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground mb-1',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <span className="font-medium">{isOwn ? 'You' : displayName}</span>
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2 break-words',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>

        {/* Delete button (shown on hover) */}
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
            onClick={() => onDelete(message.id)}
            aria-label="Delete message"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
