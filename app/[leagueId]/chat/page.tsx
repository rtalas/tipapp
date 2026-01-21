import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { ChatView } from '@/components/chat/ChatView'
import type { ChatMessage } from '@/hooks/useMessages'

interface ChatPageProps {
  params: Promise<{ leagueId: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { leagueId: leagueIdParam } = await params
  const leagueId = parseInt(leagueIdParam, 10)

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
          <h1 className="text-2xl font-bold mb-2">Chat Disabled</h1>
          <p className="text-muted-foreground">
            Chat is not enabled for this league.
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
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You are not a member of this league.
          </p>
        </div>
      </div>
    )
  }

  // Fetch initial messages
  const messages = await prisma.message.findMany({
    where: {
      leagueId,
      deletedAt: null,
    },
    include: {
      LeagueUser: {
        include: {
          User: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Reverse to show oldest first
  const initialMessages = messages.reverse() as unknown as ChatMessage[]

  return (
    <ChatView
      leagueId={leagueId}
      leagueName={league.name}
      initialMessages={initialMessages}
      currentUserId={userId}
      currentLeagueUserId={leagueUser.id}
      isLeagueAdmin={leagueUser.admin === true}
      isSuperadmin={session.user.isSuperadmin === true}
      isSuspended={league.chatSuspendedAt !== null}
    />
  )
}
