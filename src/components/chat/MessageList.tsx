'use client'

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage } from '@/hooks/useMessages'

interface MessageListProps {
  messages: ChatMessage[]
  currentUserId: number
  currentLeagueUserId: number
  isLeagueAdmin: boolean
  isSuperadmin: boolean
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onDelete: (id: number) => void
}

export function MessageList({
  messages,
  currentUserId,
  currentLeagueUserId,
  isLeagueAdmin,
  isSuperadmin,
  isLoading,
  hasMore,
  onLoadMore,
  onDelete,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevMessagesLength = useRef(messages.length)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Only scroll if new messages were added (not when loading old ones)
    if (messages.length > prevMessagesLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessagesLength.current = messages.length
  }, [messages.length])

  // Initial scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [])

  const canDeleteMessage = (message: ChatMessage) => {
    const isAuthor = message.LeagueUser.userId === currentUserId
    return isAuthor || isLeagueAdmin || isSuperadmin
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Load older messages'
            )}
          </Button>
        </div>
      )}

      {/* Messages */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.LeagueUser.userId === currentUserId}
          canDelete={canDeleteMessage(message)}
          onDelete={onDelete}
        />
      ))}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  )
}
