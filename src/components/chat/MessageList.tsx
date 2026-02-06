'use client'

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage } from '@/hooks/useMessages'

export interface MessageListHandle {
  scrollToMessage: (messageId: number) => void
}

interface MessageListProps {
  messages: ChatMessage[]
  currentUserId: number
  isLeagueAdmin: boolean
  isSuperadmin: boolean
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onDelete: (id: number) => void
  onReply: (message: ChatMessage) => void
  onScrollToMessage: (messageId: number) => void
}

export const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList(
    {
      messages,
      currentUserId,
      isLeagueAdmin,
      isSuperadmin,
      isLoading,
      hasMore,
      onLoadMore,
      onDelete,
      onReply,
      onScrollToMessage,
    },
    ref
  ) {
    const bottomRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const prevMessagesLength = useRef(messages.length)
    const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map())

    const scrollToMessage = useCallback((messageId: number) => {
      const el = messageRefs.current.get(messageId)
      if (!el) return

      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bg-primary/10')
      setTimeout(() => {
        el.classList.remove('bg-primary/10')
      }, 1500)
    }, [])

    useImperativeHandle(ref, () => ({ scrollToMessage }), [scrollToMessage])

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

    const setMessageRef = useCallback((messageId: number, el: HTMLDivElement | null) => {
      if (el) {
        messageRefs.current.set(messageId, el)
      } else {
        messageRefs.current.delete(messageId)
      }
    }, [])

    if (messages.length === 0 && !isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>No messages yet. Start the conversation!</p>
        </div>
      )
    }

    return (
      <div ref={containerRef} className="flex-1 p-4 space-y-4">
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
          <div
            key={message.id}
            ref={(el) => setMessageRef(message.id, el)}
            className="transition-colors duration-500 rounded-lg"
          >
            <MessageBubble
              message={message}
              isOwn={message.LeagueUser.userId === currentUserId}
              canDelete={canDeleteMessage(message)}
              onDelete={onDelete}
              onReply={onReply}
              onScrollToOriginal={onScrollToMessage}
            />
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    )
  }
)
