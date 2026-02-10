'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { useMessages, type ChatMessage } from '@/hooks/useMessages'
import { MessageList, type MessageListHandle } from './MessageList'
import { MessageInput } from './MessageInput'

interface ChatViewProps {
  leagueId: number
  initialMessages: ChatMessage[]
  currentUserId: number
  isLeagueAdmin: boolean
  isSuperadmin: boolean
  isSuspended: boolean
}

export function ChatView({
  leagueId,
  initialMessages,
  currentUserId,
  isLeagueAdmin,
  isSuperadmin,
  isSuspended,
}: ChatViewProps) {
  const t = useTranslations('user.chat')
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const messageListRef = useRef<MessageListHandle>(null)

  const {
    messages,
    isLoading,
    isSending,
    error,
    send,
    remove,
    react,
    loadMore,
    hasMore,
  } = useMessages({
    leagueId,
    currentUserId,
    initialMessages,
    pollingInterval: 30000,
    enabled: true,
  })

  const handleSend = useCallback(
    async (text: string): Promise<boolean> => {
      const success = await send(text, replyingTo?.id)
      if (success) {
        setReplyingTo(null)
      }
      return success
    },
    [send, replyingTo]
  )

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo(message)
  }, [])

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [])

  const handleScrollToMessage = useCallback((messageId: number) => {
    messageListRef.current?.scrollToMessage(messageId)
  }, [])

  return (
    <>
      {/* Error banner */}
      {error && (
        <div className="-mt-4 -mx-4 mb-4 p-3 bg-destructive/10 border-b border-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Suspended banner */}
      {isSuspended && (
        <div className="-mt-4 -mx-4 mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-500 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('chatSuspended')}
          </span>
        </div>
      )}

      {/* Scrollable Message list - pb-20 to make room for fixed input */}
      <div className="-mx-4 -mt-4 pb-20">
        <MessageList
          ref={messageListRef}
          messages={messages}
          currentUserId={currentUserId}
          isLeagueAdmin={isLeagueAdmin}
          isSuperadmin={isSuperadmin}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onDelete={remove}
          onReply={handleReply}
          onReaction={react}
          onScrollToMessage={handleScrollToMessage}
        />
      </div>

      {/* Fixed Input - positioned above bottom nav (bottom-20 = 80px) */}
      <div className="fixed bottom-20 left-0 right-0 z-40 border-t border-border/50 bg-background">
        <div className="max-w-2xl mx-auto">
          <MessageInput
            onSend={handleSend}
            isSending={isSending}
            disabled={isSuspended}
            placeholder={isSuspended ? t('chatIsSuspended') : t('placeholder')}
            replyingTo={replyingTo}
            onCancelReply={handleCancelReply}
          />
        </div>
      </div>
    </>
  )
}
