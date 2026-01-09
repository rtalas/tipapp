'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Check, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  approveRequest,
  rejectRequest,
  updateLeagueUserAdmin,
  updateLeagueUserActive,
  updateLeagueUserPaid,
  removeLeagueUser,
} from '@/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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

interface UserRequest {
  id: number
  userId: number
  leagueId: number
  createdAt: Date
  User: User
  League: League
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

interface UsersContentProps {
  pendingRequests: UserRequest[]
  leagueUsers: LeagueUser[]
  leagues: League[]
  league?: League
}

export function UsersContent({ pendingRequests, leagueUsers, leagues, league }: UsersContentProps) {
  const [search, setSearch] = React.useState('')
  const [leagueFilter, setLeagueFilter] = React.useState<string>('all')
  const [processingRequests, setProcessingRequests] = React.useState<Set<number>>(new Set())
  const [removeDialogOpen, setRemoveDialogOpen] = React.useState(false)
  const [userToRemove, setUserToRemove] = React.useState<LeagueUser | null>(null)
  const [isRemoving, setIsRemoving] = React.useState(false)

  // Filter league users with optimized string search
  const filteredLeagueUsers = leagueUsers.filter((lu) => {
    // League filter (only if not on league-specific page)
    if (!league && leagueFilter !== 'all' && lu.leagueId !== parseInt(leagueFilter, 10)) {
      return false
    }

    // Search filter - optimized: combine searchable fields
    if (search) {
      const searchLower = search.toLowerCase()
      const fullName = `${lu.User.firstName} ${lu.User.lastName}`.toLowerCase()
      const email = lu.User.email?.toLowerCase() ?? ''
      const username = lu.User.username.toLowerCase()
      const searchableText = `${fullName} ${email} ${username}`.toLowerCase()
      return searchableText.includes(searchLower)
    }

    return true
  })

  const handleApprove = async (requestId: number) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId))
    try {
      await approveRequest(requestId)
      toast.success('Request approved')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to approve request')
      }
      console.error(error)
    } finally {
      setProcessingRequests((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  const handleReject = async (requestId: number) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId))
    try {
      await rejectRequest(requestId)
      toast.success('Request rejected')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to reject request')
      }
      console.error(error)
    } finally {
      setProcessingRequests((prev) => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
    }
  }

  const handleToggleAdmin = async (leagueUserId: number, currentValue: boolean) => {
    try {
      await updateLeagueUserAdmin(leagueUserId, !currentValue)
      toast.success(currentValue ? 'Admin role removed' : 'Admin role granted')
    } catch (error) {
      toast.error('Failed to update admin status')
      console.error(error)
    }
  }

  const handleToggleActive = async (leagueUserId: number, currentValue: boolean) => {
    try {
      await updateLeagueUserActive(leagueUserId, !currentValue)
      toast.success(currentValue ? 'User deactivated' : 'User activated')
    } catch (error) {
      toast.error('Failed to update active status')
      console.error(error)
    }
  }

  const handleTogglePaid = async (leagueUserId: number, currentValue: boolean) => {
    try {
      await updateLeagueUserPaid(leagueUserId, !currentValue)
      toast.success(currentValue ? 'Marked as unpaid' : 'Marked as paid')
    } catch (error) {
      toast.error('Failed to update paid status')
      console.error(error)
    }
  }

  const handleRemove = async () => {
    if (!userToRemove) return
    setIsRemoving(true)
    try {
      await removeLeagueUser(userToRemove.id)
      toast.success('User removed from league')
      setRemoveDialogOpen(false)
      setUserToRemove(null)
    } catch (error) {
      toast.error('Failed to remove user')
      console.error(error)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
      {/* Pending Requests */}
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>
                Users waiting for league access approval
              </CardDescription>
            </div>
            {pendingRequests.length > 0 && (
              <Badge variant="warning" className="text-sm">
                {pendingRequests.length} Pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No pending requests</p>
              <p className="text-sm text-muted-foreground mt-1">
                All user requests have been processed
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Requested League</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id} className="table-row-hover">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {request.User.firstName} {request.User.lastName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            @{request.User.username}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {request.User.email || '-'}
                      </TableCell>
                      <TableCell>{request.League.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(request.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => handleApprove(request.id)}
                            disabled={processingRequests.has(request.id)}
                          >
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Approve</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleReject(request.id)}
                            disabled={processingRequests.has(request.id)}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Reject</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* League Users */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>League Users</CardTitle>
          <CardDescription>
            Manage user access and permissions across leagues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            {!league && (
              <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="League" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leagues</SelectItem>
                  {leagues.map((lg) => (
                    <SelectItem key={lg.id} value={lg.id.toString()}>
                      {lg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {filteredLeagueUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-center">Paid</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeagueUsers.map((lu) => (
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
                          onCheckedChange={() => handleToggleAdmin(lu.id, lu.admin ?? false)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={lu.active ?? false}
                          onCheckedChange={() => handleToggleActive(lu.id, lu.active ?? false)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={lu.paid}
                          onCheckedChange={() => handleTogglePaid(lu.id, lu.paid)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserToRemove(lu)
                            setRemoveDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User from League</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {userToRemove?.User.firstName}{' '}
              {userToRemove?.User.lastName} from {userToRemove?.League.name}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isRemoving}>
              {isRemoving ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
