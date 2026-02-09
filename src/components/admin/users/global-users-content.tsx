'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Search, Shield, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { updateUser, deleteUser } from '@/actions/users'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import { validate } from '@/lib/validation-client'
import { useInlineEdit } from '@/hooks/useInlineEdit'
import { useDeleteDialog } from '@/hooks/useDeleteDialog'
import { DeleteEntityDialog } from '@/components/admin/common/delete-entity-dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AdminUser } from '@/actions/users'

interface GlobalUsersContentProps {
  users: AdminUser[]
}

interface EditFormData {
  firstName: string
  lastName: string
  username: string
  email: string
  isSuperadmin: boolean
}

export function GlobalUsersContent({ users }: GlobalUsersContentProps) {
  const t = useTranslations('admin.users')
  const tCommon = useTranslations('admin.common')
  const [search, setSearch] = useState('')

  const inlineEdit = useInlineEdit<EditFormData>()
  const deleteDialog = useDeleteDialog<AdminUser>()

  const filteredUsers = users.filter((user) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    const searchable = `${user.firstName} ${user.lastName} ${user.username} ${user.email ?? ''}`.toLowerCase()
    return searchable.includes(searchLower)
  })

  const getUserName = (user: AdminUser) => {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
  }

  const handleStartEdit = (user: AdminUser) => {
    inlineEdit.startEdit(user.id, {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
      isSuperadmin: user.isSuperadmin,
    })
  }

  const handleSaveEdit = async (userId: number) => {
    if (!inlineEdit.form) return

    const validation = validate.userEdit({
      id: userId,
      firstName: inlineEdit.form.firstName || undefined,
      lastName: inlineEdit.form.lastName || undefined,
      username: inlineEdit.form.username || undefined,
      email: inlineEdit.form.email || undefined,
      isSuperadmin: inlineEdit.form.isSuperadmin,
    })

    if (!validation.success) {
      const message = getErrorMessage(validation.error, t('validationFailed'))
      toast.error(message)
      return
    }

    inlineEdit.setSaving(true)
    try {
      const result = await updateUser({
        id: userId,
        firstName: inlineEdit.form.firstName || undefined,
        lastName: inlineEdit.form.lastName || undefined,
        username: inlineEdit.form.username || undefined,
        email: inlineEdit.form.email || undefined,
        isSuperadmin: inlineEdit.form.isSuperadmin,
      })
      if (!result.success) {
        toast.error('error' in result ? result.error : t('userUpdateFailed'))
        return
      }
      toast.success(t('userUpdated'))
      inlineEdit.finishEdit()
    } catch (error) {
      const message = getErrorMessage(error, t('userUpdateFailed'))
      toast.error(message)
      logger.error('Failed to update user', { error, userId })
    } finally {
      inlineEdit.setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog.itemToDelete) return

    deleteDialog.startDeleting()
    try {
      const result = await deleteUser(deleteDialog.itemToDelete.id)
      if (!result.success) {
        toast.error('error' in result ? result.error : t('userDeleteFailed'))
        deleteDialog.cancelDeleting()
        return
      }
      toast.success(t('userDeleted'))
      deleteDialog.finishDeleting()
    } catch (error) {
      const message = getErrorMessage(error, t('userDeleteFailed'))
      toast.error(message)
      logger.error('Failed to delete user', { error, userId: deleteDialog.itemToDelete?.id })
      deleteDialog.cancelDeleting()
    }
  }

  return (
    <>
      <Card className="card-shadow">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('allUsers')}</CardTitle>
              <CardDescription>{t('allUsersDescription', { count: users.length })}</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('firstName')}</TableHead>
                  <TableHead>{t('lastName')}</TableHead>
                  <TableHead>{t('username')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead className="text-center">{t('leagues')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('registered')}</TableHead>
                  <TableHead className="w-[80px]">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t('noUsersFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isEditing = inlineEdit.editingId === user.id

                    if (isEditing && inlineEdit.form) {
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Input
                              value={inlineEdit.form.firstName}
                              onChange={(e) => inlineEdit.updateForm({ firstName: e.target.value })}
                              className="h-8 w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={inlineEdit.form.lastName}
                              onChange={(e) => inlineEdit.updateForm({ lastName: e.target.value })}
                              className="h-8 w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={inlineEdit.form.username}
                              onChange={(e) => inlineEdit.updateForm({ username: e.target.value })}
                              className="h-8 w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={inlineEdit.form.email}
                              onChange={(e) => inlineEdit.updateForm({ email: e.target.value })}
                              className="h-8 w-40"
                            />
                          </TableCell>
                          <TableCell className="text-center">{user._count.LeagueUser}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={inlineEdit.form.isSuperadmin}
                                onCheckedChange={(checked) =>
                                  inlineEdit.updateForm({ isSuperadmin: checked === true })
                                }
                              />
                              <span className="text-sm">{t('superadmin')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(user.createdAt), 'yyyy-MM-dd')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleSaveEdit(user.id)}
                                disabled={inlineEdit.isSaving}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={inlineEdit.cancelEdit}
                                disabled={inlineEdit.isSaving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.firstName}</TableCell>
                        <TableCell>{user.lastName}</TableCell>
                        <TableCell className="text-muted-foreground">{user.username}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                        <TableCell className="text-center">{user._count.LeagueUser}</TableCell>
                        <TableCell>
                          {user.isSuperadmin && (
                            <Badge variant="default" className="gap-1">
                              <Shield className="h-3 w-3" />
                              {t('superadmin')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(user.createdAt), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleStartEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteDialog.openDialog(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DeleteEntityDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.onOpenChange}
        title={t('deleteTitle')}
        description={
          deleteDialog.itemToDelete
            ? t('deleteConfirm', {
                firstName: deleteDialog.itemToDelete.firstName,
                lastName: deleteDialog.itemToDelete.lastName,
              })
            : ''
        }
        warningMessage={
          deleteDialog.itemToDelete && deleteDialog.itemToDelete._count.LeagueUser > 0
            ? t('deleteWarning', { count: deleteDialog.itemToDelete._count.LeagueUser })
            : undefined
        }
        onConfirm={handleDelete}
        isDeleting={deleteDialog.isDeleting}
      />
    </>
  )
}
