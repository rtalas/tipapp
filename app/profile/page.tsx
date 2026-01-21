import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getUserProfile } from '@/actions/user/profile'
import { ProfileContent } from '@/components/user/profile/profile-content'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const profile = await getUserProfile()

  return <ProfileContent profile={profile} />
}
