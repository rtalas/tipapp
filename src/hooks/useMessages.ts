'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getMessages, sendMessage, deleteMessage } from '@/actions/messages'

// Message type based on what the server returns
export interface ChatMessage {
  id: number
  leagueId: number
  leagueUserId: number
  text: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  LeagueUser: {
    id: number
    userId: number
    User: {
      id: number
      firstName: string
      lastName: string
      username: string
      avatarUrl: string | null
    }
  }
  ReplyTo: {
    id: number
    text: string
    deletedAt: Date | null
    LeagueUser: {
      id: number
      userId: number
      User: { id: number; firstName: string; lastName: string; username: string }
    }
  } | null
}

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

  // Track the newest message timestamp for polling
  const newestTimestamp = useRef<Date | null>(
    initialMessages.length > 0
      ? new Date(initialMessages[initialMessages.length - 1].createdAt)
      : null
  )

  // Fetch new messages (for polling)
  const fetchNewMessages = useCallback(async () => {
    if (!enabled) return

    try {
      const result = await getMessages({ leagueId, limit: 50 })

      if (result.success && result.messages) {
        const newMessages = result.messages as ChatMessage[]

        // Merge new messages, avoiding duplicates
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id))
          const uniqueNew = newMessages.filter((m) => !existingIds.has(m.id))

          if (uniqueNew.length > 0) {
            const merged = [...prev, ...uniqueNew].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
            // Update newest timestamp
            if (merged.length > 0) {
              newestTimestamp.current = new Date(merged[merged.length - 1].createdAt)
            }
            return merged
          }
          return prev
        })
      }
    } catch {
      // Silently fail polling - don't show error to user
      console.error('Polling failed')
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

        if (result.success && result.message) {
          const newMessage = result.message as ChatMessage
          setMessages((prev) => [...prev, newMessage])
          newestTimestamp.current = new Date(newMessage.createdAt)
          return true
        } else {
          setError(result.error || 'Failed to send message')
          return false
        }
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
    if (!hasMore || isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const oldestMessage = messages[0]
      const result = await getMessages({
        leagueId,
        limit: 50,
        before: oldestMessage ? new Date(oldestMessage.createdAt) : undefined,
      })

      if (result.success && result.messages) {
        const olderMessages = result.messages as ChatMessage[]
        setMessages((prev) => [...olderMessages, ...prev])
        setHasMore(result.hasMore ?? false)
      } else {
        setError(result.error || 'Failed to load messages')
      }
    } catch {
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }, [leagueId, messages, hasMore, isLoading])

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getMessages({ leagueId, limit: 50 })

      if (result.success && result.messages) {
        setMessages(result.messages as ChatMessage[])
        setHasMore(result.hasMore ?? false)
      } else {
        setError(result.error || 'Failed to refresh messages')
      }
    } catch {
      setError('Failed to refresh messages')
    } finally {
      setIsLoading(false)
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
