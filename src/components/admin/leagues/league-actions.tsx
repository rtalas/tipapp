'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Settings, Users, Edit, Award, MessageSquare, Pause, Play, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { updateLeague, updateLeagueChatSettings } from '@/actions/leagues'
import { getLeaguePrizes, updateLeaguePrizes } from '@/actions/league-prizes'
import { logger } from '@/lib/logging/client-logger'
import type { PrizeTier } from '@/lib/validation/admin'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { LeagueDeleteButton } from './league-delete-button'
import { LeaguePrizesSection } from './league-prizes-section'
import { LeagueFinesSection } from './league-fines-section'

interface LeagueActionsProps {
  leagueId: number
  leagueName: string
  seasonFrom: number
  seasonTo: number
  isActive: boolean
  isPublic: boolean
  isChatEnabled: boolean
  chatSuspendedAt: Date | null
  infoText: string | null
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
  infoText,
}: LeagueActionsProps) {
  const t = useTranslations('admin.leagueActions')
  const tCommon = useTranslations('admin.common')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: leagueName,
    seasonFrom,
    seasonTo,
    isActive,
    isPublic,
    isChatEnabled,
    infoText: infoText || '',
  })
  const [isChatSuspended, setIsChatSuspended] = useState(chatSuspendedAt !== null)
  const [prizes, setPrizes] = useState<PrizeTier[]>([])
  const [fines, setFines] = useState<PrizeTier[]>([])
  const [prizesLoaded, setPrizesLoaded] = useState(false)

  // Fetch prizes and fines when dialog opens
  useEffect(() => {
    if (editDialogOpen && !prizesLoaded) {
      getLeaguePrizes(leagueId).then((result) => {
        if (result.success && 'prizes' in result && 'fines' in result) {
          // Map prizes to PrizeTier format (remove id and type fields)
          if (result.prizes) {
            const mappedPrizes = result.prizes.map(({ rank, amount, currency, label }) => ({
              rank,
              amount,
              currency,
              label: label ?? undefined,
              type: 'prize' as const,
            }))
            setPrizes(mappedPrizes)
          }

          // Map fines to PrizeTier format
          if (result.fines) {
            const mappedFines = result.fines.map(({ rank, amount, currency, label }) => ({
              rank,
              amount,
              currency,
              label: label ?? undefined,
              type: 'fine' as const,
            }))
            setFines(mappedFines)
          }
        }
        setPrizesLoaded(true)
      }).catch((error) => {
        logger.error('Failed to load prizes and fines', { error, leagueId })
        setPrizesLoaded(true)
      })
    }
  }, [editDialogOpen, prizesLoaded, leagueId])

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      toast.error(t('validation.nameRequired'))
      return
    }

    if (editForm.seasonTo < editForm.seasonFrom) {
      toast.error(t('validation.seasonEndGreater'))
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
        infoText: editForm.infoText || null,
      })

      // Update chat settings if changed
      if (editForm.isChatEnabled !== isChatEnabled) {
        await updateLeagueChatSettings({
          leagueId,
          isChatEnabled: editForm.isChatEnabled,
        })
      }

      // Update prizes and fines
      await updateLeaguePrizes({
        leagueId,
        prizes,
        fines,
      })

      toast.success(t('toast.updated'))
      setEditDialogOpen(false)
      setPrizesLoaded(false) // Reset to reload on next open
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error(t('toast.updateFailed'))
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
        toast.success(isChatSuspended ? t('toast.chatResumed') : t('toast.chatSuspended'))
      } else {
        const errorMessage = 'error' in result ? result.error : t('toast.chatStatusFailed')
        toast.error(errorMessage)
      }
    } catch (error) {
      toast.error(t('toast.chatStatusFailed'))
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('editTitle')}</DialogTitle>
            <DialogDescription>{t('editDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <Label htmlFor="name">{t('leagueName')}</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="seasonFrom">{t('seasonFrom')}</Label>
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
                <Label htmlFor="seasonTo">{t('seasonTo')}</Label>
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
              <Label htmlFor="isActive">{t('active')}</Label>
              <Switch
                id="isActive"
                checked={editForm.isActive}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, isActive: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isPublic">{t('public')}</Label>
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
                {t('chatSettings')}
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isChatEnabled">{t('enableChat')}</Label>
                  <p className="text-xs text-muted-foreground">{t('enableChatHelper')}</p>
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
                      {isChatSuspended
                        ? t('chatStatus', { status: t('chatStatusSuspended') })
                        : t('chatStatus', { status: t('chatStatusActive') })
                      }
                    </span>
                    {isChatSuspended && chatSuspendedAt && (
                      <p className="text-xs text-muted-foreground">
                        {t('chatSuspendedSince', { date: new Date(chatSuspendedAt).toLocaleString() })}
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
                        <Play className="h-3 w-3 mr-1" /> {t('chatResume')}
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 mr-1" /> {t('chatSuspend')}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mt-4">
              <LeaguePrizesSection prizes={prizes} onChange={setPrizes} />
            </div>

            <div className="border-t pt-4 mt-4">
              <LeagueFinesSection fines={fines} onChange={setFines} />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t('leagueInfo')}
              </h4>
              <div>
                <Label htmlFor="infoText">{t('infoText')}</Label>
                <Textarea
                  id="infoText"
                  value={editForm.infoText}
                  onChange={(e) => setEditForm({ ...editForm, infoText: e.target.value })}
                  placeholder={t('infoTextPlaceholder')}
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">{t('infoTextHelper')}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSaving}
            >
              {tCommon('button.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? tCommon('saving') : tCommon('button.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
