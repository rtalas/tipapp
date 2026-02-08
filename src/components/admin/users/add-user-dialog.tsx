import React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getUserDisplayNameWithUsername } from '@/lib/user-display-utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface User {
  id: number
  firstName: string
  lastName: string
  username: string
}

interface League {
  id: number
  name: string
}

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedUserId: string
  onUserIdChange: (value: string) => void
  selectedLeagueId: string
  onLeagueIdChange: (value: string) => void
  allUsers: User[]
  leagues: League[]
  showLeagueSelector: boolean
  isLoadingUsers: boolean
  isAddingUser: boolean
  onAddUser: () => Promise<void>
  onCancel: () => void
}

export function AddUserDialog({
  open,
  onOpenChange,
  selectedUserId,
  onUserIdChange,
  selectedLeagueId,
  onLeagueIdChange,
  allUsers,
  leagues,
  showLeagueSelector,
  isLoadingUsers,
  isAddingUser,
  onAddUser,
  onCancel,
}: AddUserDialogProps) {
  const t = useTranslations('admin.users')
  const tCommon = useTranslations('admin.common')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addUserTitle')}</DialogTitle>
          <DialogDescription>
            {t('addUserDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* User selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('user')}</label>
            <Select
              value={selectedUserId}
              onValueChange={onUserIdChange}
              disabled={isLoadingUsers || allUsers.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingUsers
                      ? tCommon('loading')
                      : allUsers.length === 0
                      ? t('noUsersAvailable')
                      : t('selectUser')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {getUserDisplayNameWithUsername(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* League selector (only if not on league-specific page) */}
          {showLeagueSelector && (
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('league')}</label>
              <Select
                value={selectedLeagueId}
                onValueChange={onLeagueIdChange}
                disabled={leagues.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      leagues.length === 0
                        ? tCommon('noLeaguesAvailable')
                        : t('selectLeague')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((lg) => (
                    <SelectItem key={lg.id} value={lg.id.toString()}>
                      {lg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={onAddUser} disabled={isAddingUser}>
            {isAddingUser ? t('adding') : t('addUserButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
