import React from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface League {
  id: number
  name: string
}

interface User {
  id: number
  firstName: string
  lastName: string
}

interface MatchFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  leagueFilter: string
  onLeagueFilterChange: (value: string) => void
  userFilter: string
  onUserFilterChange: (value: string) => void
  leagues: League[]
  users: User[]
  showLeagueFilter: boolean
  onAddMatch: () => void
}

export function MatchFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  leagueFilter,
  onLeagueFilterChange,
  userFilter,
  onUserFilterChange,
  leagues,
  users,
  showLeagueFilter,
  onAddMatch,
}: MatchFiltersProps) {
  const t = useTranslations('admin.matches')

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 md:flex-row md:flex-wrap">
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full md:max-w-sm"
        />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allStatus')}</SelectItem>
            <SelectItem value="scheduled">{t('scheduled')}</SelectItem>
            <SelectItem value="live">{t('inProgress')}</SelectItem>
            <SelectItem value="finished">{t('finished')}</SelectItem>
            <SelectItem value="evaluated">{t('evaluated')}</SelectItem>
          </SelectContent>
        </Select>
        {showLeagueFilter && (
          <Select value={leagueFilter} onValueChange={onLeagueFilterChange}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t('league')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allLeagues')}</SelectItem>
              {leagues.map((lg) => (
                <SelectItem key={lg.id} value={lg.id.toString()}>
                  {lg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={userFilter} onValueChange={onUserFilterChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder={t('allUsers')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('allUsers')}</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.firstName} {user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onAddMatch} className="w-full md:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        {t('addMatch')}
      </Button>
    </div>
  )
}
