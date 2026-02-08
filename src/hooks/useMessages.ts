'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getMessages, sendMessage, deleteMessage } from '@/actions/messages'
import type { MessageWithRelations } from '@/lib/prisma-helpers'

export type ChatMessage = MessageWithRelations

interface UseMessagesOptions {
  leagueId: number
  initialMessages?: ChatMessage[]
  pollingInterval?: number // in milliseconds
  enabled?: boolean // whether to enable polling
}

interface UseMessagesReturn {
  messages: ChatMessage[]
  isLoading: boolean
  isSending: boolean
  error: string | null
  send: (text: string, replyToId?: number) => Promise<boolean>
  remove: (messageId: number) => Promise<boolean>
  loadMore: () => Promise<void>
  hasMore: boolean
  refresh: () => Promise<void>
}

/**
 * Hook for managing chat messages with polling support.
 * Handles fetching, sending, deleting, and real-time updates via polling.
 *
 * Concurrency: All fetch operations (polling, loadMore, refresh) share a single
 * isFetchingRef guard to prevent overlapping requests. Only one can run at a time.
 */
export function useMessages({
  leagueId,
  initialMessages = [],
  pollingInterval = 5000,
  enabled = true,
}: UseMessagesOptions): UseMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // Track the newest message timestamp for incremental polling
  const newestTimestamp = useRef<Date | null>(
    initialMessages.length > 0
      ? new Date(initialMessages[initialMessages.length - 1].createdAt)
      : null
  )

  // Track the oldest message timestamp for loadMore
  const oldestTimestamp = useRef<Date | null>(
    initialMessages.length > 0
      ? new Date(initialMessages[0].createdAt)
      : null
  )

  // Guard against concurrent fetch operations (shared across poll, loadMore, refresh)
  const isFetchingRef = useRef(false)

  // Track hasMore in a ref so loadMore doesn't need it as a dependency
  const hasMoreRef = useRef(true)

  // Reset timestamps when enabled transitions from false to true
  const prevEnabledRef = useRef(enabled)
  useEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      // Re-enabled: reset cursors to avoid stale gaps
      newestTimestamp.current = null
      oldestTimestamp.current = null
      hasMoreRef.current = true
      setHasMore(true)
    }
    prevEnabledRef.current = enabled
  }, [enabled])

  // Fetch new messages (for polling) — incremental via `after` parameter
  const fetchNewMessages = useCallback(async () => {
    if (!enabled || isFetchingRef.current) return

    isFetchingRef.current = true
    try {
      const result = await getMessages({
        leagueId,
        limit: 50,
        after: newestTimestamp.current ?? undefined,
      })

      if (result.success) {
        const newMessages = result.messages as ChatMessage[]

        if (newMessages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id))

            if (uniqueNew.length > 0) {
              const merged = [...prev, ...uniqueNew]
              newestTimestamp.current = new Date(merged[merged.length - 1].createdAt)
              return merged
            }
            return prev
          })
        }
      }
    } catch {
      // Silently fail polling - don't show error to user
      console.error('Polling failed')
    } finally {
      isFetchingRef.current = false
    }
  }, [leagueId, enabled])

  // Initial fetch and polling setup
  useEffect(() => {
    if (!enabled) return

    // Initial fetch if no initial messages provided
    if (initialMessages.length === 0) {
      setIsLoading(true)
      fetchNewMessages().finally(() => setIsLoading(false))
    }

    // Set up polling
    const intervalId = setInterval(fetchNewMessages, pollingInterval)

    return () => clearInterval(intervalId)
  }, [fetchNewMessages, pollingInterval, enabled, initialMessages.length])

  // Send a new message
  const send = useCallback(
    async (text: string, replyToId?: number): Promise<boolean> => {
      if (!text.trim()) return false

      setIsSending(true)
      setError(null)

      try {
        const result = await sendMessage({ leagueId, text: text.trim(), replyToId })

        if (!result.success) {
          setError(result.error || 'Failed to send message')
          return false
        }
        const newMessage = result.message as ChatMessage
        setMessages((prev) => [...prev, newMessage])
        newestTimestamp.current = new Date(newMessage.createdAt)
        return true
      } catch {
        setError('Failed to send message')
        return false
      } finally {
        setIsSending(false)
      }
    },
    [leagueId]
  )

  // Delete a message
  const remove = useCallback(async (messageId: number): Promise<boolean> => {
    try {
      const result = await deleteMessage({ id: messageId })

      if (result.success) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
        return true
      } else {
        setError(result.error || 'Failed to delete message')
        return false
      }
    } catch {
      setError('Failed to delete message')
      return false
    }
  }, [])

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || isFetchingRef.current) return

    isFetchingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await getMessages({
        leagueId,
        limit: 50,
        before: oldestTimestamp.current ?? undefined,
      })

      if (!result.success) {
        setError(result.error || 'Failed to load messages')
      } else {
        const olderMessages = result.messages as ChatMessage[]
        if (olderMessages.length > 0) {
          oldestTimestamp.current = new Date(olderMessages[0].createdAt)
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id))
            const uniqueOlder = olderMessages.filter((m) => !existingIds.has(m.id))
            return uniqueOlder.length > 0 ? [...uniqueOlder, ...prev] : prev
          })
        }
        const more = result.hasMore ?? false
        hasMoreRef.current = more
        setHasMore(more)
      }
    } catch {
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [leagueId])

  // Manual refresh — replaces all messages with fresh data
  const refresh = useCallback(async () => {
    if (isFetchingRef.current) return

    isFetchingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await getMessages({ leagueId, limit: 50 })

      if (!result.success) {
        setError(result.error || 'Failed to refresh messages')
      } else {
        const refreshedMessages = result.messages as ChatMessage[]
        setMessages(refreshedMessages)
        const more = result.hasMore ?? false
        hasMoreRef.current = more
        setHasMore(more)
        if (refreshedMessages.length > 0) {
          newestTimestamp.current = new Date(refreshedMessages[refreshedMessages.length - 1].createdAt)
          oldestTimestamp.current = new Date(refreshedMessages[0].createdAt)
        } else {
          newestTimestamp.current = null
          oldestTimestamp.current = null
        }
      }
    } catch {
      setError('Failed to refresh messages')
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [leagueId])

  return {
    messages,
    isLoading,
    isSending,
    error,
    send,
    remove,
    loadMore,
    hasMore,
    refresh,
  }
}
