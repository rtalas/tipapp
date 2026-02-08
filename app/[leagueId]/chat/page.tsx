import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect, notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ChatView } from '@/components/chat/ChatView'
import { ChatSkeleton } from '@/components/chat/chat-skeleton'
import { markChatAsRead } from '@/actions/messages'
import { messageWithRelationsInclude } from '@/lib/prisma-helpers'

export const metadata: Metadata = { title: 'Chat' }

interface ChatPageProps {
  params: Promise<{ leagueId: string }>
}

async function ChatContent({
  leagueId,
  userId,
  isLeagueAdmin,
  isSuperadmin,
  isSuspended,
}: {
  leagueId: number
  userId: number
  isLeagueAdmin: boolean
  isSuperadmin: boolean
  isSuspended: boolean
}) {
  // Mark chat as read and fetch messages in parallel
  const [, messages] = await Promise.all([
    markChatAsRead(leagueId),
    prisma.message.findMany({
      where: {
        leagueId,
        deletedAt: null,
      },
      include: messageWithRelationsInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  const initialMessages = messages.reverse()

  return (
    <ChatView
      leagueId={leagueId}
      initialMessages={initialMessages}
      currentUserId={userId}
      isLeagueAdmin={isLeagueAdmin}
      isSuperadmin={isSuperadmin}
      isSuspended={isSuspended}
    />
  )
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)
  const t = await getTranslations('user.chat')

  if (isNaN(leagueId)) {
    notFound()
  }

  // Check authentication
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  const userId = parseInt(session.user.id, 10)

  // Get league and check chat is enabled
  const league = await prisma.league.findUnique({
    where: { id: leagueId, deletedAt: null },
    select: {
      id: true,
      name: true,
      isChatEnabled: true,
      chatSuspendedAt: true,
    },
  })

  if (!league) {
    notFound()
  }

  if (!league.isChatEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('chatDisabled')}</h1>
          <p className="text-muted-foreground">
            {t('chatDisabledDescription')}
          </p>
        </div>
      </div>
    )
  }

  // Check user is a member of the league
  const leagueUser = await prisma.leagueUser.findFirst({
    where: {
      userId,
      leagueId,
      active: true,
      deletedAt: null,
    },
  })

  if (!leagueUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t('accessDenied')}</h1>
          <p className="text-muted-foreground">
            {t('accessDeniedDescription')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatContent
        leagueId={leagueId}
        userId={userId}
        isLeagueAdmin={leagueUser.admin === true}
        isSuperadmin={session.user.isSuperadmin === true}
        isSuspended={league.chatSuspendedAt !== null}
      />
    </Suspense>
  )
}
