'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Forces a fresh server fetch every time the chat page is mounted, bypassing
// the client Router Cache. Other users' messages don't trigger a server action
// on this client, so the cached RSC payload would otherwise stay stale until
// staleTimes.dynamic expires.
export function ChatRefreshOnMount() {
  const router = useRouter()
  useEffect(() => {
    router.refresh()
  }, [router])
  return null
}
