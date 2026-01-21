'use client'

import * as React from 'react'
import Link from 'next/link'
import { Settings, Users, Trash2, Edit, Award, MessageSquare, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import { updateLeague, updateLeagueChatSettings } from '@/actions/leagues'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { LeagueDeleteButton } from './league-delete-button'

interface LeagueActionsProps {
  leagueId: number
  leagueName: string
  seasonFrom: number
  seasonTo: number
  isActive: boolean
  isPublic: boolean
  isChatEnabled: boolean
  chatSuspendedAt: Date | null
}

export function LeagueActions({
  leagueId,
  leagueName,
  seasonFrom,
  seasonTo,
  isActive,
  isPublic,
  isChatEnabled,
  chatSuspendedAt,
}: LeagueActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editForm, setEditForm] = React.useState({
    name: leagueName,
    seasonFrom,
    seasonTo,
    isActive,
    isPublic,
    isChatEnabled,
  })
  const [isChatSuspended, setIsChatSuspended] = React.useState(chatSuspendedAt !== null)

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      toast.error('League name cannot be empty')
      return
    }

    if (editForm.seasonTo < editForm.seasonFrom) {
      toast.error('Season end must be greater than or equal to season start')
      return
    }

    setIsSaving(true)
    try {
      // Update basic league info
      await updateLeague({
        id: leagueId,
        name: editForm.name,
        seasonFrom: editForm.seasonFrom,
        seasonTo: editForm.seasonTo,
        isActive: editForm.isActive,
        isPublic: editForm.isPublic,
      })

      // Update chat settings if changed
      if (editForm.isChatEnabled !== isChatEnabled) {
        await updateLeagueChatSettings({
          leagueId,
          isChatEnabled: editForm.isChatEnabled,
        })
      }

      toast.success('League updated successfully')
      setEditDialogOpen(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update league')
      }
      logger.error('Failed to update league', { error, leagueId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSuspendChat = async () => {
    setIsSaving(true)
    try {
      const result = await updateLeagueChatSettings({
        leagueId,
        suspend: !isChatSuspended,
      })

      if (result.success) {
        setIsChatSuspended(!isChatSuspended)
        toast.success(isChatSuspended ? 'Chat resumed' : 'Chat suspended')
      } else {
        const errorMessage = 'error' in result ? result.error : 'Failed to update chat status'
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error('Failed to update chat status')
      logger.error('Failed to suspend/resume chat', { error, leagueId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditDialogOpen(true)}
          aria-label={`Edit league: ${leagueName}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          aria-label={`Manage evaluators for: ${leagueName}`}
        >
          <Link href={`/admin/leagues/${leagueId}/evaluators`}>
            <Award className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          aria-label={`Setup teams for: ${leagueName}`}
        >
          <Link href={`/admin/leagues/${leagueId}/setup`}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          asChild
          aria-label={`Manage users for: ${leagueName}`}
        >
          <Link href={`/admin/leagues/${leagueId}/users`}>
            <Users className="h-4 w-4" />
          </Link>
        </Button>
        <LeagueDeleteButton leagueId={leagueId} leagueName={leagueName} />
      </div>

      {/* Edit League Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit League</DialogTitle>
            <DialogDescription>Update league details and settings</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">League Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seasonFrom">Season From</Label>
                <Input
                  id="seasonFrom"
                  type="number"
                  min="2000"
                  max="2100"
                  value={editForm.seasonFrom}
                  onChange={(e) =>
                    setEditForm({ ...editForm, seasonFrom: parseInt(e.target.value, 10) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="seasonTo">Season To</Label>
                <Input
                  id="seasonTo"
                  type="number"
                  min="2000"
                  max="2100"
                  value={editForm.seasonTo}
                  onChange={(e) =>
                    setEditForm({ ...editForm, seasonTo: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, isActive: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isPublic">Public</Label>
              <Switch
                id="isPublic"
                checked={editForm.isPublic}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, isPublic: checked })
                }
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat Settings
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isChatEnabled">Enable Chat</Label>
                  <p className="text-xs text-muted-foreground">Allow users to chat in this league</p>
                </div>
                <Switch
                  id="isChatEnabled"
                  checked={editForm.isChatEnabled}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isChatEnabled: checked })
                  }
                />
              </div>

              {editForm.isChatEnabled && (
                <div className="flex items-center justify-between mt-3 p-3 bg-muted/50 rounded-md">
                  <div>
                    <span className="text-sm">
                      {isChatSuspended ? 'Chat is suspended' : 'Chat is active'}
                    </span>
                    {isChatSuspended && chatSuspendedAt && (
                      <p className="text-xs text-muted-foreground">
                        Since {new Date(chatSuspendedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant={isChatSuspended ? 'default' : 'outline'}
                    size="sm"
                    onClick={handleSuspendChat}
                    disabled={isSaving}
                  >
                    {isChatSuspended ? (
                      <>
                        <Play className="h-3 w-3 mr-1" /> Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 mr-1" /> Suspend
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
