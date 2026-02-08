import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getUserProfile } from '@/actions/user/profile'
import { ProfileContent } from '@/components/user/profile/profile-content'
import { ProfileSkeleton } from '@/components/user/profile/profile-skeleton'

export const metadata: Metadata = { title: 'Profile' }

async function ProfilePageContent() {
  const profile = await getUserProfile()
  return <ProfileContent profile={profile} />
}

export default async function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfilePageContent />
    </Suspense>
  )
}
