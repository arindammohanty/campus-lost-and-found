'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function LostPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!description) return

    setLoading(true)
    setMessage('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('User not authenticated')

      // Will fail gracefully if DB isn't live
      const { error: insertError } = await supabase
        .from('lost_items')
        .insert({
          owner_id: user.id,
          description
          // text_embedding is now optional upon creation, will be generated upon scanning
        })

      if (insertError) throw insertError

      setMessage('LISTING CREATED SUCCESSFULLY')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
    } catch (err: any) {
      setMessage(`ERROR: ${err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono selection:bg-black selection:text-white p-8">
      <header className="max-w-3xl mx-auto mb-12 flex justify-between items-center border-b-2 border-black pb-4">
        <Link href="/dashboard" className="text-xs font-bold uppercase hover:bg-black hover:text-white px-3 py-2 border-2 border-black transition-colors">
          &larr; Return to Dashboard
        </Link>
        <div className="text-xs font-bold uppercase">System: Active</div>
      </header>

      <div className="max-w-3xl mx-auto">
        <h1 className="text-5xl font-black tracking-tighter uppercase mb-4">Create Lost Listing</h1>
        <p className="text-sm font-bold uppercase mb-12 opacity-80">
          Provide a detailed description. You can scan for visual matches from your dashboard anytime.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-3">
              Item Description
            </label>
            <textarea
              required
              rows={5}
              className="w-full bg-white border-2 border-black p-4 text-lg focus:outline-none focus:ring-4 focus:ring-black focus:ring-offset-0 transition-shadow"
              placeholder="e.g. A blue hydroflask with university stickers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !description}
            className="w-full border-2 border-black bg-black px-6 py-4 text-white text-lg font-black uppercase hover:bg-white hover:text-black transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving Listing...' : 'Create Listing'}
          </button>

          {message && (
            <div className="p-4 border-2 border-black bg-black text-white text-center text-sm font-black uppercase">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
