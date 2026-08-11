'use client'

import { useMatchNotifications } from '@/hooks/useMatchNotifications'

export default function NotificationsProvider({ userId }: { userId: string }) {
  useMatchNotifications(userId)
  return null
}
