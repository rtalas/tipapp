import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UserSelectorInputProps {
  value: string
  onChange: (value: string) => void
  showAllUsersNote?: boolean
}

/**
 * Shared user selector input for create bet dialogs
 * Currently a placeholder using manual LeagueUser ID input
 * TODO: Replace with dropdown that fetches all league users and filters out those with existing bets
 * Used by: create-bet-dialog, create-series-bet-dialog, create-special-bet-user-bet-dialog
 */
export function UserSelectorInput({ value, onChange, showAllUsersNote = false }: UserSelectorInputProps) {
  return (
    <div className="space-y-2">
      {showAllUsersNote && (
        <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
          Note: User selection requires fetching all league users. This is a placeholder implementation.
          In production, this would fetch all users from the league and filter out those who already have bets.
        </div>
      )}

      <Label htmlFor="user">User</Label>
      <Input
        id="user"
        placeholder="Enter LeagueUser ID manually"
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="League User ID"
      />
      <p className="text-xs text-muted-foreground">
        Temporary: Enter the LeagueUser ID directly. In production, this would be a dropdown.
      </p>
    </div>
  )
}
