import React from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MobileCard, MobileCardField } from '@/components/admin/common/mobile-card'
import { ActionMenu } from '@/components/admin/common/action-menu'

interface User {
  id: number
  firstName: string
  lastName: string
  username: string
  email: string | null
}

interface League {
  id: number
  name: string
}

interface LeagueUser {
  id: number
  userId: number
  leagueId: number
  paid: boolean
  active: boolean | null
  admin: boolean | null
  User: User
  League: League
}

interface LeagueUsersTableProps {
  leagueUsers: LeagueUser[]
  search: string
  onSearchChange: (value: string) => void
  leagueFilter: string
  onLeagueFilterChange: (value: string) => void
  leagues: League[]
  showLeagueFilter: boolean
  onToggleAdmin: (leagueUserId: number, currentValue: boolean) => Promise<void>
  onToggleActive: (leagueUserId: number, currentValue: boolean) => Promise<void>
  onTogglePaid: (leagueUserId: number, currentValue: boolean) => Promise<void>
  onRemove: (leagueUser: LeagueUser) => void
  onAddUser: () => void
}

export function LeagueUsersTable({
  leagueUsers,
  search,
  onSearchChange,
  leagueFilter,
  onLeagueFilterChange,
  leagues,
  showLeagueFilter,
  onToggleAdmin,
  onToggleActive,
  onTogglePaid,
  onRemove,
  onAddUser,
}: LeagueUsersTableProps) {
  const t = useTranslations('admin.users')
  const tCommon = useTranslations('admin.common')
  const tSeries = useTranslations('admin.series')

  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('leagueUsers')}</CardTitle>
            <CardDescription>
              {t('leagueUsersDescription')}
            </CardDescription>
          </div>
          <Button onClick={onAddUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('addUser')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full md:max-w-sm"
          />
          {showLeagueFilter && (
            <Select value={leagueFilter} onValueChange={onLeagueFilterChange}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={t('league')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tSeries('allLeagues')}</SelectItem>
                {leagues.map((lg) => (
                  <SelectItem key={lg.id} value={lg.id.toString()}>
                    {lg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {leagueUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">{t('noUsersFound')}</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('user')}</TableHead>
                      <TableHead>{t('league')}</TableHead>
                      <TableHead className="text-center">{t('admin')}</TableHead>
                      <TableHead className="text-center">{t('active')}</TableHead>
                      <TableHead className="text-center">{t('paid')}</TableHead>
                      <TableHead className="w-[60px]">{tCommon('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leagueUsers.map((lu) => (
                      <TableRow key={lu.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {lu.User.firstName} {lu.User.lastName}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {lu.User.email || `@${lu.User.username}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{lu.League.name}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={lu.admin ?? false}
                            onCheckedChange={() => onToggleAdmin(lu.id, lu.admin ?? false)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={lu.active ?? false}
                            onCheckedChange={() => onToggleActive(lu.id, lu.active ?? false)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={lu.paid}
                            onCheckedChange={() => onTogglePaid(lu.id, lu.paid)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(lu)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {leagueUsers.map((lu) => (
                <MobileCard key={lu.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{lu.User.firstName} {lu.User.lastName}</div>
                      <div className="text-sm text-muted-foreground">{lu.User.email || `@${lu.User.username}`}</div>
                    </div>
                    <ActionMenu items={[{ label: tCommon('delete'), icon: <Trash2 className="h-4 w-4" />, onClick: () => onRemove(lu), variant: 'destructive' }]} />
                  </div>
                  <MobileCardField label={t('league')}>{lu.League.name}</MobileCardField>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('admin')}</span>
                    <Switch checked={lu.admin ?? false} onCheckedChange={() => onToggleAdmin(lu.id, lu.admin ?? false)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('active')}</span>
                    <Switch checked={lu.active ?? false} onCheckedChange={() => onToggleActive(lu.id, lu.active ?? false)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('paid')}</span>
                    <Switch checked={lu.paid} onCheckedChange={() => onTogglePaid(lu.id, lu.paid)} />
                  </div>
                </MobileCard>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
