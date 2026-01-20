'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createLeague } from '@/actions/leagues'
import { logger } from '@/lib/client-logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Sport {
  id: number
  name: string
}

interface LeagueFormProps {
  sports: Sport[]
}

export function LeagueForm({ sports }: LeagueFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const currentYear = new Date().getFullYear()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      const result = await createLeague({
        name: formData.get('name') as string,
        sportId: Number(formData.get('sportId')),
        seasonFrom: Number(formData.get('seasonFrom')),
        seasonTo: Number(formData.get('seasonTo')),
        isActive: formData.get('isActive') === 'on',
        isPublic: formData.get('isPublic') === 'on',
      })

      if (result.success && 'leagueId' in result) {
        toast.success('League created successfully')
        router.push(`/admin/leagues/${result.leagueId}/setup`)
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to create league')
      }
      logger.error('Failed to create league', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>League Details</CardTitle>
          <CardDescription>
            Basic information about the prediction league
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">League Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Euro 2024, NHL 2024/25"
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sportId">Sport</Label>
            <Select name="sportId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select a sport" />
              </SelectTrigger>
              <SelectContent>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id.toString()}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seasonFrom">Season Start Year</Label>
              <Input
                id="seasonFrom"
                name="seasonFrom"
                type="number"
                min={2000}
                max={2100}
                defaultValue={currentYear}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seasonTo">Season End Year</Label>
              <Input
                id="seasonTo"
                name="seasonTo"
                type="number"
                min={2000}
                max={2100}
                defaultValue={currentYear}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Configure league visibility and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to submit predictions
              </p>
            </div>
            <Switch id="isActive" name="isActive" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPublic">Public</Label>
              <p className="text-sm text-muted-foreground">
                Visible to all users (they can request to join)
              </p>
            </div>
            <Switch id="isPublic" name="isPublic" defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Scoring Rules</CardTitle>
          <CardDescription>
            Default scoring rules will be created automatically. You can customize them after creating the league.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Exact Score</span>
              <span className="font-mono text-sm font-medium">5 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Goal Difference</span>
              <span className="font-mono text-sm font-medium">3 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Correct Winner</span>
              <span className="font-mono text-sm font-medium">2 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Total Goals</span>
              <span className="font-mono text-sm font-medium">1 pt</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Correct Scorer</span>
              <span className="font-mono text-sm font-medium">2 pts</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create League'}
        </Button>
      </div>
    </form>
  )
}
