import Avatar from 'boring-avatars'

interface UserAvatarProps {
  userId: string
  displayName?: string | null
  email?: string
  size?: number
}

/** Marble-textured, museum-toned avatars — same userId always produces the same image. */
const PALETTE = ['#FAFAF8', '#EDEBF2', '#EFECF3', '#1A1A18', '#C6FF3A']

export function UserAvatar({ userId, displayName, email, size = 40 }: UserAvatarProps) {
  return (
    <Avatar
      variant="marble"
      name={userId}
      colors={PALETTE}
      size={size}
      title={displayName ?? email ?? undefined}
      square={false}
    />
  )
}
