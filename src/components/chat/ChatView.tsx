'use client'

import { AlertTriangle } from 'lucide-react'
import { useMessages, type ChatMessage } from '@/hooks/useMessages'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

interface ChatViewProps {
  leagueId: number
  leagueName: string
  initialMessages: ChatMessage[]
  currentUserId: number
  currentLeagueUserId: number
  isLeagueAdmin: boolean
  isSuperadmin: boolean
  isSuspended: boolean
}

export function ChatView({
  leagueId,
  leagueName,
  initialMessages,
  currentUserId,
  currentLeagueUserId,
  isLeagueAdmin,
  isSuperadmin,
  isSuspended,
}: ChatViewProps) {
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
    pollingInterval: 5000,
    enabled: true,
  })

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-lg font-semibold">{leagueName} Chat</h1>
      </div>

      {/* Error banner */}
      {error && (
        <div className="m-4 mb-0 p-3 rounded-md border border-destructive bg-destructive/10 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      {/* Suspended banner */}
      {isSuspended && (
        <div className="m-4 mb-0 p-3 rounded-md border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-800 dark:text-yellow-200">
            Chat is temporarily suspended. You can read messages but cannot send new ones.
          </span>
        </div>
      )}

      {/* Message list */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        currentLeagueUserId={currentLeagueUserId}
        isLeagueAdmin={isLeagueAdmin}
        isSuperadmin={isSuperadmin}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onDelete={remove}
      />

      {/* Input */}
      <MessageInput
        onSend={send}
        isSending={isSending}
        disabled={isSuspended}
        placeholder={isSuspended ? 'Chat is suspended' : 'Type a message...'}
      />
    </div>
  )
}
