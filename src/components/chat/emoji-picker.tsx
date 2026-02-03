'use client'

import { useState } from 'react'
import { Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EMOJI_CATEGORIES } from '@/lib/chat/emoji-data'
import { useTranslations } from 'next-intl'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  disabled?: boolean
}

export function EmojiPicker({ onEmojiSelect, disabled = false }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const t = useTranslations('user.chat')

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    setOpen(false) // Close popover after selection (mobile-first UX)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-11 w-11 rounded-full flex-shrink-0"
          aria-label={t('emojiPicker')}
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-[280px] p-0"
        sideOffset={8}
      >
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {EMOJI_CATEGORIES.map((category) => (
              <div key={category.id} className="mb-3 last:mb-0">
                <div className="sticky top-0 z-10 bg-background px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {t(`emojiCategories.${category.name}`)}
                </div>
                <div className="grid grid-cols-7 gap-1 px-1">
                  {category.emojis.map((emoji, index) => (
                    <button
                      key={`${category.id}-${index}`}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="h-11 w-11 rounded hover:bg-accent flex items-center justify-center text-2xl transition-colors"
                      aria-label={`Select ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
