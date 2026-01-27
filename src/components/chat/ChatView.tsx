'use client'

import { useTranslations } from 'next-intl'
import { AlertTriangle, MessageCircle } from 'lucide-react'
import { useMessages, type ChatMessage } from '@/hooks/useMessages'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

interface ChatViewProps {
  leagueId: number
  leagueName: string
  initialMessages: ChatMessage[]
  currentUserId: number
  isLeagueAdmin: boolean
  isSuperadmin: boolean
  isSuspended: boolean
}

export function ChatView({
  leagueId,
  leagueName,
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
    <div className="fixed inset-0 top-14 bottom-16 flex flex-col bg-background">
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center gap-2 p-4 border-b border-border/50">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-primary">
            <MessageCircle className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-foreground">{leagueName} {t('title')}</h1>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex-shrink-0 mx-4 mt-4 p-3 rounded-xl border border-destructive bg-destructive/10 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Suspended banner */}
        {isSuspended && (
          <div className="flex-shrink-0 mx-4 mt-4 p-3 rounded-xl border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              {t('chatSuspended')}
            </span>
          </div>
        )}

        {/* Scrollable Message list */}
        <div className="flex-1 overflow-hidden">
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
        <div className="flex-shrink-0 border-t border-border/50">
          <MessageInput
            onSend={send}
            isSending={isSending}
            disabled={isSuspended}
            placeholder={isSuspended ? t('chatIsSuspended') : t('placeholder')}
          />
        </div>
      </div>
    </div>
  )
}
