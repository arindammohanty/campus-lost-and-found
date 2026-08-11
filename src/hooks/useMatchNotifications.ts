'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export function useMatchNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    
    const channel = supabase.channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `account_id=eq.${userId}`,
        },
        (payload) => {
          // In a real app, integrate with a toast library like react-hot-toast or sonner
          alert(`A potential match for your lost item has been registered! Similarity: ${(payload.new.similarity * 100).toFixed(1)}%`)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
}
