import React from 'react'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MobileCard, MobileCardField } from '@/components/admin/common/mobile-card'

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

interface PendingRequestsTableProps {
  requests: UserRequest[]
  onApprove: (requestId: number) => Promise<void>
  onReject: (requestId: number) => Promise<void>
  processingRequests: Set<number>
}

export function PendingRequestsTable({
  requests,
  onApprove,
  onReject,
  processingRequests,
}: PendingRequestsTableProps) {
  const t = useTranslations('admin.users')
  const tCommon = useTranslations('admin.common')

  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('pendingRequests')}</CardTitle>
            <CardDescription>
              {t('pendingRequestsDescription')}
            </CardDescription>
          </div>
          {requests.length > 0 && (
            <Badge variant="warning" className="text-sm">
              {t('pending', { count: requests.length })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">{t('noPendingRequests')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('allRequestsProcessed')}
            </p>
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
                      <TableHead>{t('email')}</TableHead>
                      <TableHead>{t('requestedLeague')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead className="w-[120px]">{tCommon('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
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
                              onClick={() => onApprove(request.id)}
                              disabled={processingRequests.has(request.id)}
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">{t('approve')}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => onReject(request.id)}
                              disabled={processingRequests.has(request.id)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">{t('reject')}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {requests.map((request) => (
                <MobileCard key={request.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{request.User.firstName} {request.User.lastName}</div>
                      <div className="text-sm text-muted-foreground">@{request.User.username}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => onApprove(request.id)}
                        disabled={processingRequests.has(request.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onReject(request.id)}
                        disabled={processingRequests.has(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <MobileCardField label={t('email')}>{request.User.email || '-'}</MobileCardField>
                  <MobileCardField label={t('requestedLeague')}>{request.League.name}</MobileCardField>
                  <MobileCardField label={t('date')}>{format(new Date(request.createdAt), 'MMM d, yyyy')}</MobileCardField>
                </MobileCard>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
