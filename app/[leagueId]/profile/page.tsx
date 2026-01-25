import { getUserProfile } from '@/actions/user/profile'
import { ProfileContent } from '@/components/user/profile/profile-content'

export default async function ProfilePage() {
  // Auth is checked in the layout
  const profile = await getUserProfile()

  return <ProfileContent profile={profile} />
}
