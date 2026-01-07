'use client'

import * as React from 'react'
import Link from 'next/link'
import { Settings, Users, Trash2, Edit, Award } from 'lucide-react'
import { toast } from 'sonner'
import { updateLeague } from '@/actions/leagues'
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
}

export function LeagueActions({
  leagueId,
  leagueName,
  seasonFrom,
  seasonTo,
  isActive,
  isPublic,
}: LeagueActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editForm, setEditForm] = React.useState({
    name: leagueName,
    seasonFrom,
    seasonTo,
    isActive,
    isPublic,
  })

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
      await updateLeague({
        id: leagueId,
        name: editForm.name,
        seasonFrom: editForm.seasonFrom,
        seasonTo: editForm.seasonTo,
        isActive: editForm.isActive,
        isPublic: editForm.isPublic,
      })
      toast.success('League updated successfully')
      setEditDialogOpen(false)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to update league')
      }
      console.error(error)
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
