import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getCurrentUserProfile } from '@/actions/profile'
import { ProfileContent } from '@/components/admin/profile/profile-content'

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const result = await getCurrentUserProfile()

  if (!result.success || !result.user) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">Failed to load profile: {result.error}</p>
      </div>
    )
  }

  return <ProfileContent user={result.user} />
}
