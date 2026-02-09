'use client'

import { MoreVertical } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ActionMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'destructive'
}

interface ActionMenuProps {
  items: ActionMenuItem[]
}

export function ActionMenu({ items }: ActionMenuProps) {
  const t = useTranslations('admin.common')

  const destructiveItems = items.filter((item) => item.variant === 'destructive')
  const normalItems = items.filter((item) => item.variant !== 'destructive')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('moreActions')}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {normalItems.map((item) => (
          <DropdownMenuItem key={item.label} onClick={item.onClick}>
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </DropdownMenuItem>
        ))}
        {destructiveItems.length > 0 && normalItems.length > 0 && (
          <DropdownMenuSeparator />
        )}
        {destructiveItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={item.onClick}
            className={cn('text-destructive focus:text-destructive')}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
