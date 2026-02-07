'use client'

import React, { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  approveRequest,
  rejectRequest,
  updateLeagueUserAdmin,
  updateLeagueUserActive,
  updateLeagueUserPaid,
  removeLeagueUser,
  addUserToLeague,
  getUsers,
} from '@/actions/users'
import { logger } from '@/lib/logging/client-logger'
import { DeleteEntityDialog } from '@/components/admin/common/delete-entity-dialog'
import { PendingRequestsTable } from './pending-requests-table'
import { LeagueUsersTable } from './league-users-table'
import { AddUserDialog } from './add-user-dialog'

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
  const t = useTranslations('admin.users')
  const [search, setSearch] = useState('')
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [processingRequests, setProcessingRequests] = useState<Set<number>>(new Set())
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [userToRemove, setUserToRemove] = useState<LeagueUser | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')
  const [allUsers, setAllUsers] = useState<Array<{ id: number; firstName: string; lastName: string; username: string }>>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)

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
      toast.success(t('requestApproved'))
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('requestApprovedFailed'))
      }
      logger.error('Failed to approve user request', { error, requestId })
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
      toast.success(t('requestRejected'))
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('requestRejectedFailed'))
      }
      logger.error('Failed to reject user request', { error, requestId })
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
      toast.success(currentValue ? t('adminRoleRemoved') : t('adminRoleGranted'))
    } catch (error) {
      toast.error(t('adminUpdateFailed'))
      logger.error('Failed to toggle admin status', { error, leagueUserId })
    }
  }

  const handleToggleActive = async (leagueUserId: number, currentValue: boolean) => {
    try {
      await updateLeagueUserActive(leagueUserId, !currentValue)
      toast.success(currentValue ? t('userDeactivated') : t('userActivated'))
    } catch (error) {
      toast.error(t('activeUpdateFailed'))
      logger.error('Failed to toggle active status', { error, leagueUserId })
    }
  }

  const handleTogglePaid = async (leagueUserId: number, currentValue: boolean) => {
    try {
      await updateLeagueUserPaid(leagueUserId, !currentValue)
      toast.success(currentValue ? t('markedAsUnpaid') : t('markedAsPaid'))
    } catch (error) {
      toast.error(t('paidUpdateFailed'))
      logger.error('Failed to toggle paid status', { error, leagueUserId })
    }
  }

  const handleRemove = async () => {
    if (!userToRemove) return
    setIsRemoving(true)
    try {
      await removeLeagueUser(userToRemove.id)
      toast.success(t('userRemoved'))
      setRemoveDialogOpen(false)
      setUserToRemove(null)
    } catch (error) {
      toast.error(t('userRemoveFailed'))
      logger.error('Failed to remove user from league', { error, leagueUserId: userToRemove?.id })
    } finally {
      setIsRemoving(false)
    }
  }

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const users = await getUsers()
      // Filter out users who are already members of the selected league
      const leagueIdToCheck = league?.id ?? (selectedLeagueId ? parseInt(selectedLeagueId) : null)
      if (leagueIdToCheck) {
        const filteredUsers = users.filter(
          (user) => !leagueUsers.some((lu) => lu.userId === user.id && lu.leagueId === leagueIdToCheck)
        )
        setAllUsers(filteredUsers)
      } else {
        setAllUsers(users)
      }
    } catch (error) {
      toast.error('Failed to load users')
      logger.error('Failed to load users', { error })
    } finally {
      setIsLoadingUsers(false)
    }
  }, [league?.id, selectedLeagueId, leagueUsers])

  const handleAddUser = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }

    const leagueId = league?.id ?? (selectedLeagueId ? parseInt(selectedLeagueId) : null)
    if (!leagueId) {
      toast.error('Please select a league')
      return
    }

    setIsAddingUser(true)
    try {
      await addUserToLeague(parseInt(selectedUserId), leagueId)
      toast.success(t('addUserSuccess'))
      setAddUserDialogOpen(false)
      setSelectedUserId('')
      setSelectedLeagueId('')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('addUserFailed'))
      }
      logger.error('Failed to add user to league', { error, userId: selectedUserId, leagueId })
    } finally {
      setIsAddingUser(false)
    }
  }

  const handleCancelAddUser = () => {
    setAddUserDialogOpen(false)
    setSelectedUserId('')
    setSelectedLeagueId('')
  }

  // Load users when dialog opens
  React.useEffect(() => {
    if (addUserDialogOpen) {
      loadUsers()
    }
  }, [addUserDialogOpen, loadUsers])

  return (
    <>
      {/* Pending Requests */}
      <PendingRequestsTable
        requests={pendingRequests}
        onApprove={handleApprove}
        onReject={handleReject}
        processingRequests={processingRequests}
      />

      {/* League Users */}
      <LeagueUsersTable
        leagueUsers={filteredLeagueUsers}
        search={search}
        onSearchChange={setSearch}
        leagueFilter={leagueFilter}
        onLeagueFilterChange={setLeagueFilter}
        leagues={leagues}
        showLeagueFilter={!league}
        onToggleAdmin={handleToggleAdmin}
        onToggleActive={handleToggleActive}
        onTogglePaid={handleTogglePaid}
        onRemove={(lu) => {
          setUserToRemove(lu)
          setRemoveDialogOpen(true)
        }}
        onAddUser={() => setAddUserDialogOpen(true)}
      />

      {/* Remove Confirmation Dialog */}
      <DeleteEntityDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title={t('removeTitle')}
        description={
          userToRemove
            ? t('removeConfirm', {
                firstName: userToRemove.User.firstName ?? '',
                lastName: userToRemove.User.lastName ?? '',
                leagueName: userToRemove.League.name ?? '',
              })
            : ''
        }
        onConfirm={handleRemove}
        isDeleting={isRemoving}
      />

      {/* Add User Dialog */}
      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        selectedUserId={selectedUserId}
        onUserIdChange={setSelectedUserId}
        selectedLeagueId={selectedLeagueId}
        onLeagueIdChange={setSelectedLeagueId}
        allUsers={allUsers}
        leagues={leagues}
        showLeagueSelector={!league}
        isLoadingUsers={isLoadingUsers}
        isAddingUser={isAddingUser}
        onAddUser={handleAddUser}
        onCancel={handleCancelAddUser}
      />
    </>
  )
}
