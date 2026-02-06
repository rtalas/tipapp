'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Reply, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EmojiPicker } from './emoji-picker'
import type { ChatMessage } from '@/hooks/useMessages'

interface MessageInputProps {
  onSend: (text: string) => Promise<boolean>
  isSending: boolean
  disabled?: boolean
  placeholder?: string
  replyingTo?: ChatMessage | null
  onCancelReply?: () => void
}

export function MessageInput({
  onSend,
  isSending,
  disabled = false,
  placeholder = 'Type a message...',
  replyingTo,
  onCancelReply,
}: MessageInputProps) {
  const t = useTranslations('user.chat')
  const [text, setText] = useState('')
  const [cursorPosition, setCursorPosition] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [text])

  // Auto-focus when replying
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus()
    }
  }, [replyingTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isSending || disabled) return

    const success = await onSend(text)
    if (success) {
      setText('')
      setCursorPosition(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cancel reply on Escape
    if (e.key === 'Escape' && replyingTo) {
      e.preventDefault()
      onCancelReply?.()
      return
    }
    // Submit on Enter (without Shift for newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    setCursorPosition(e.target.selectionStart)
  }

  const handleTextareaBlur = () => {
    setCursorPosition(textareaRef.current?.selectionStart ?? null)
  }

  const insertEmojiAtCursor = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = cursorPosition ?? text.length
    const newText = text.slice(0, start) + emoji + text.slice(start)

    setText(newText)

    // Restore focus and move cursor after emoji
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + emoji.length
      textarea.setSelectionRange(newPosition, newPosition)
      setCursorPosition(newPosition)
    }, 0)
  }

  const replyAuthor = replyingTo?.LeagueUser.User
  const replyAuthorName = replyAuthor
    ? replyAuthor.firstName && replyAuthor.lastName
      ? `${replyAuthor.firstName} ${replyAuthor.lastName}`
      : replyAuthor.username
    : ''

  return (
    <div>
      {/* Reply preview bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border/50">
          <Reply className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium text-foreground">
              {t('replyingTo', { name: replyAuthorName })}
            </span>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.text}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={onCancelReply}
            aria-label={t('cancelReply')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextareaChange}
          onBlur={handleTextareaBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-xl border border-border bg-secondary/50 px-4 py-3',
            'text-sm placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'min-h-[44px] max-h-[120px]'
          )}
          aria-label="Message input"
        />
        <EmojiPicker
          onEmojiSelect={insertEmojiAtCursor}
          disabled={disabled || isSending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!text.trim() || isSending || disabled}
          className="h-11 w-11 rounded-full flex-shrink-0"
          aria-label="Send message"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  )
}
