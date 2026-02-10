'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { QUICK_REACTIONS, EMOJI_CATEGORIES } from '@/lib/chat/emoji-data'
import { useTranslations } from 'next-intl'

interface ReactionBarProps {
  onReact: (emoji: string) => void
  onClose: () => void
}

export function ReactionBar({ onReact, onClose }: ReactionBarProps) {
  const [showFullPicker, setShowFullPicker] = useState(false)
  const t = useTranslations('user.chat')

  const handleReact = (emoji: string) => {
    onReact(emoji)
    onClose()
    setShowFullPicker(false)
  }

  return (
    <div className="flex items-center gap-0.5 bg-popover border rounded-full px-1.5 py-1 shadow-lg animate-in fade-in zoom-in-95 duration-150">
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleReact(emoji)}
          className="h-9 w-9 rounded-full hover:bg-accent active:scale-125 flex items-center justify-center text-xl transition-all"
          aria-label={t('reactWith', { emoji })}
        >
          {emoji}
        </button>
      ))}
      <Popover open={showFullPicker} onOpenChange={setShowFullPicker}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
            aria-label={t('moreReactions')}
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="center" className="w-[280px] p-0" sideOffset={8}>
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
                        onClick={() => handleReact(emoji)}
                        className="h-11 w-11 rounded hover:bg-accent flex items-center justify-center text-2xl transition-colors"
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
    </div>
  )
}
