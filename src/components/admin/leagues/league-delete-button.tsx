'use client'

import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteLeague } from '@/actions/leagues'
import { getErrorMessage } from '@/lib/error-handler'
import { logger } from '@/lib/logging/client-logger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface LeagueDeleteButtonProps {
  leagueId: number
  leagueName: string
}

export function LeagueDeleteButton({ leagueId, leagueName }: LeagueDeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteLeague({ id: leagueId })
      if (!result.success) {
        toast.error('error' in result ? result.error : 'Failed to delete league')
        return
      }
      toast.success('League deleted successfully')
      setOpen(false)
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to delete league')
      toast.error(message)
      logger.error('Failed to delete league', { error, leagueId })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Delete league: ${leagueName}`}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete League</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{leagueName}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
