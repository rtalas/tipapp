'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLeagueUsers } from '@/actions/users'
import { getUserDisplayNameWithUsername } from '@/lib/user-display-utils'

interface UserSelectorInputProps {
  value: string
  onChange: (value: string) => void
  leagueId: number
  existingBetUserIds: number[] // LeagueUser IDs who already have bets
}

type LeagueUserOption = {
  id: number
  User: {
    id: number
    firstName: string | null
    lastName: string | null
    username: string
  }
}

/**
 * User selector with dropdown for create bet dialogs
 * Fetches all league users and filters out those who already have bets
 * Used by: create-bet-dialog, create-series-bet-dialog, create-special-bet-user-bet-dialog
 */
export function UserSelectorInput({
  value,
  onChange,
  leagueId,
  existingBetUserIds,
}: UserSelectorInputProps) {
  const [users, setUsers] = useState<LeagueUserOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        setIsLoading(true)
        setError(null)

        const allUsers = await getLeagueUsers({ leagueId })

        // Filter out users who already have bets and only include active users
        const availableUsers = allUsers
          .filter((lu) => lu.active && !lu.deletedAt && !existingBetUserIds.includes(lu.id))
          .map((lu) => ({
            id: lu.id,
            User: {
              id: lu.User.id,
              firstName: lu.User.firstName,
              lastName: lu.User.lastName,
              username: lu.User.username,
            },
          }))

        setUsers(availableUsers)
      } catch (err) {
        console.error('Failed to fetch league users:', err)
        setError('Failed to load users')
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsers()
  }, [leagueId, existingBetUserIds])

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>User</Label>
        <div className="text-sm text-muted-foreground">Loading users...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>User</Label>
        <div className="text-sm text-destructive">{error}</div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="space-y-2">
        <Label>User</Label>
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 text-sm text-yellow-800 dark:text-yellow-200">
          All users in this league already have bets for this item.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="user-selector">User</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="user-selector" aria-label="Select user">
          <SelectValue placeholder="Select a user..." />
        </SelectTrigger>
        <SelectContent>
          {users.map((user) => (
            <SelectItem key={user.id} value={user.id.toString()}>
              {getUserDisplayNameWithUsername(user.User)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Showing {users.length} user{users.length !== 1 ? 's' : ''} without bets
      </p>
    </div>
  )
}
