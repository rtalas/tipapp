'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { useMessages, type ChatMessage } from '@/hooks/useMessages'
import { MessageList } from './MessageList'
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
  const {
    messages,
    isLoading,
    isSending,
    error,
    send,
    remove,
    loadMore,
    hasMore,
  } = useMessages({
    leagueId,
    initialMessages,
    pollingInterval: 5000000, // todo: make this as config for tournament dates
    enabled: true,
  })

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)]">
      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 -mt-4 -mx-4 mb-4 p-3 bg-destructive/10 border-b border-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Suspended banner */}
      {isSuspended && (
        <div className="flex-shrink-0 -mt-4 -mx-4 mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-500 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('chatSuspended')}
          </span>
        </div>
      )}

      {/* Scrollable Message list */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-4 -mt-4">
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isLeagueAdmin={isLeagueAdmin}
          isSuperadmin={isSuperadmin}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onDelete={remove}
        />
      </div>

      {/* Fixed Input */}
      <div className="flex-shrink-0 border-t border-border/50 -mx-4 -mb-4 bg-background">
        <MessageInput
          onSend={send}
          isSending={isSending}
          disabled={isSuspended}
          placeholder={isSuspended ? t('chatIsSuspended') : t('placeholder')}
        />
      </div>
    </div>
  )
}
