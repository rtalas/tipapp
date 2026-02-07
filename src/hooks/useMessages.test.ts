import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMessages, type ChatMessage } from './useMessages'

vi.mock('@/actions/messages', () => ({
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  deleteMessage: vi.fn(),
}))

import { getMessages, sendMessage, deleteMessage } from '@/actions/messages'

const mockGetMessages = vi.mocked(getMessages)
const mockSendMessage = vi.mocked(sendMessage)
const mockDeleteMessage = vi.mocked(deleteMessage)

function makeMessage(id: number, text: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    leagueId: 1,
    leagueUserId: 100,
    text,
    createdAt: new Date(`2026-01-15T10:00:0${id}Z`),
    updatedAt: new Date(`2026-01-15T10:00:0${id}Z`),
    deletedAt: null,
    LeagueUser: {
      id: 100,
      userId: 5,
      User: { id: 5, firstName: 'John', lastName: 'Doe', username: 'john', avatarUrl: null },
    },
    ReplyTo: null,
    ...overrides,
  }
}

describe('useMessages', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockGetMessages.mockResolvedValue({ success: true, messages: [], hasMore: false } as any)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with provided messages', () => {
    const initial = [makeMessage(1, 'Hello'), makeMessage(2, 'World')]
    const { result } = renderHook(() =>
      useMessages({ leagueId: 1, initialMessages: initial, enabled: false })
    )

    expect(result.current.messages).toHaveLength(2)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isSending).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.hasMore).toBe(true)
  })

  it('should fetch messages on mount when no initial messages', async () => {
    const msgs = [makeMessage(1, 'Fetched')]
    mockGetMessages.mockResolvedValue({ success: true, messages: msgs, hasMore: false } as any)

    const { result } = renderHook(() =>
      useMessages({ leagueId: 1, initialMessages: [], pollingInterval: 60000 })
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(mockGetMessages).toHaveBeenCalledWith({ leagueId: 1, limit: 50 })
    expect(result.current.messages).toHaveLength(1)
  })

  describe('send', () => {
    it('should send a message and append to list', async () => {
      const newMsg = makeMessage(3, 'New message')
      mockSendMessage.mockResolvedValue({ success: true, message: newMsg } as any)

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [makeMessage(1, 'Existing')], enabled: false })
      )

      let success: boolean
      await act(async () => {
        success = await result.current.send('New message')
      })

      expect(success!).toBe(true)
      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1].text).toBe('New message')
      expect(mockSendMessage).toHaveBeenCalledWith({ leagueId: 1, text: 'New message', replyToId: undefined })
    })

    it('should pass replyToId when provided', async () => {
      mockSendMessage.mockResolvedValue({ success: true, message: makeMessage(2, 'Reply') } as any)

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [], enabled: false })
      )

      await act(async () => {
        await result.current.send('Reply', 99)
      })

      expect(mockSendMessage).toHaveBeenCalledWith({ leagueId: 1, text: 'Reply', replyToId: 99 })
    })

    it('should reject empty/whitespace messages', async () => {
      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [], enabled: false })
      )

      let success: boolean
      await act(async () => {
        success = await result.current.send('   ')
      })

      expect(success!).toBe(false)
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should trim message text', async () => {
      mockSendMessage.mockResolvedValue({ success: true, message: makeMessage(1, 'Trimmed') } as any)

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [], enabled: false })
      )

      await act(async () => {
        await result.current.send('  Trimmed  ')
      })

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'Trimmed' })
      )
    })

    it('should set error on send failure', async () => {
      mockSendMessage.mockResolvedValue({ success: false, error: 'Rate limited' } as any)

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [], enabled: false })
      )

      let success: boolean
      await act(async () => {
        success = await result.current.send('Test')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Rate limited')
    })

    it('should set isSending during send', async () => {
      let resolveSend: (v: any) => void
      mockSendMessage.mockImplementation(() => new Promise(r => { resolveSend = r }))

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [], enabled: false })
      )

      let sendPromise: Promise<boolean>
      act(() => {
        sendPromise = result.current.send('Test')
      })

      expect(result.current.isSending).toBe(true)

      await act(async () => {
        resolveSend!({ success: true, message: makeMessage(1, 'Test') })
        await sendPromise!
      })

      expect(result.current.isSending).toBe(false)
    })

    it('should handle send exception gracefully', async () => {
      mockSendMessage.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [], enabled: false })
      )

      let success: boolean
      await act(async () => {
        success = await result.current.send('Test')
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Failed to send message')
      expect(result.current.isSending).toBe(false)
    })
  })

  describe('remove', () => {
    it('should remove message from list on success', async () => {
      mockDeleteMessage.mockResolvedValue({ success: true } as any)

      const { result } = renderHook(() =>
        useMessages({
          leagueId: 1,
          initialMessages: [makeMessage(1, 'First'), makeMessage(2, 'Second')],
          enabled: false,
        })
      )

      let success: boolean
      await act(async () => {
        success = await result.current.remove(1)
      })

      expect(success!).toBe(true)
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].id).toBe(2)
    })

    it('should set error on delete failure', async () => {
      mockDeleteMessage.mockResolvedValue({ success: false, error: 'Not authorized' } as any)

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [makeMessage(1, 'Msg')], enabled: false })
      )

      let success: boolean
      await act(async () => {
        success = await result.current.remove(1)
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Not authorized')
      expect(result.current.messages).toHaveLength(1)
    })

    it('should handle delete exception gracefully', async () => {
      mockDeleteMessage.mockRejectedValue(new Error('Network'))

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [makeMessage(1, 'Msg')], enabled: false })
      )

      let success: boolean
      await act(async () => {
        success = await result.current.remove(1)
      })

      expect(success!).toBe(false)
      expect(result.current.error).toBe('Failed to delete message')
    })
  })

  describe('loadMore', () => {
    it('should prepend older messages', async () => {
      const older = [makeMessage(0, 'Older')]
      mockGetMessages.mockResolvedValue({ success: true, messages: older, hasMore: true } as any)

      const { result } = renderHook(() =>
        useMessages({
          leagueId: 1,
          initialMessages: [makeMessage(1, 'Current')],
          enabled: false,
        })
      )

      await act(async () => {
        await result.current.loadMore()
      })

      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].text).toBe('Older')
    })

    it('should not load if hasMore is false', async () => {
      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [makeMessage(1, 'Msg')], enabled: false })
      )

      // Set hasMore to false via refresh
      mockGetMessages.mockResolvedValue({ success: true, messages: [makeMessage(1, 'Msg')], hasMore: false } as any)
      await act(async () => {
        await result.current.refresh()
      })

      mockGetMessages.mockClear()
      await act(async () => {
        await result.current.loadMore()
      })

      expect(mockGetMessages).not.toHaveBeenCalled()
    })

    it('should set error on loadMore failure', async () => {
      mockGetMessages.mockResolvedValue({ success: false, error: 'DB error' } as any)

      const { result } = renderHook(() =>
        useMessages({
          leagueId: 1,
          initialMessages: [makeMessage(1, 'Msg')],
          enabled: false,
        })
      )

      await act(async () => {
        await result.current.loadMore()
      })

      expect(result.current.error).toBe('DB error')
    })
  })

  describe('refresh', () => {
    it('should replace all messages with fresh data', async () => {
      const fresh = [makeMessage(1, 'Fresh 1'), makeMessage(2, 'Fresh 2')]
      mockGetMessages.mockResolvedValue({ success: true, messages: fresh, hasMore: false } as any)

      const { result } = renderHook(() =>
        useMessages({
          leagueId: 1,
          initialMessages: [makeMessage(9, 'Old')],
          enabled: false,
        })
      )

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[0].text).toBe('Fresh 1')
      expect(result.current.hasMore).toBe(false)
    })

    it('should set error on refresh failure', async () => {
      mockGetMessages.mockRejectedValue(new Error('Network'))

      const { result } = renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [], enabled: false })
      )

      await act(async () => {
        await result.current.refresh()
      })

      expect(result.current.error).toBe('Failed to refresh messages')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('polling', () => {
    it('should not poll when disabled', async () => {
      renderHook(() =>
        useMessages({ leagueId: 1, initialMessages: [makeMessage(1, 'Msg')], enabled: false })
      )

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000)
      })

      expect(mockGetMessages).not.toHaveBeenCalled()
    })

    it('should poll at specified interval', async () => {
      mockGetMessages.mockResolvedValue({ success: true, messages: [], hasMore: false } as any)

      renderHook(() =>
        useMessages({
          leagueId: 1,
          initialMessages: [makeMessage(1, 'Msg')],
          enabled: true,
          pollingInterval: 3000,
        })
      )

      // First poll after 3s
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      expect(mockGetMessages).toHaveBeenCalledTimes(1)

      // Second poll after 6s
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })
      expect(mockGetMessages).toHaveBeenCalledTimes(2)
    })

    it('should stop polling on unmount', async () => {
      mockGetMessages.mockResolvedValue({ success: true, messages: [], hasMore: false } as any)

      const { unmount } = renderHook(() =>
        useMessages({
          leagueId: 1,
          initialMessages: [makeMessage(1, 'Msg')],
          enabled: true,
          pollingInterval: 1000,
        })
      )

      unmount()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000)
      })

      expect(mockGetMessages).not.toHaveBeenCalled()
    })
  })
})
