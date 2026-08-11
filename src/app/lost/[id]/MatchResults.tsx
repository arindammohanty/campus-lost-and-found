'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MatchResults({ textEmbedding }: { textEmbedding: number[] }) {
  const supabase = createClient()
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMatches() {
      try {
        const { data, error } = await supabase.rpc('match_found_items', {
          query_embedding: textEmbedding,
          match_threshold: 0.75,
          match_count: 10
        })

        if (error) throw error
        setMatches(data || [])
      } catch (err) {
        console.error('Backend match fetch failed', err)
        setMatches([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchMatches()
  }, [textEmbedding, supabase])

  if (loading) {
    return <p className="font-bold uppercase tracking-widest text-sm animate-pulse">Running Neural Network Search...</p>
  }

  if (matches.length === 0) {
    return (
      <div className="p-12 border-2 border-dashed border-black flex items-center justify-center">
        <p className="font-bold uppercase tracking-widest text-sm text-center">No mathematical correlations found.<br/>The system will notify you if a match appears.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {matches.map((match) => (
        <div key={match.id} className="border-2 border-black group overflow-hidden">
          <div className="aspect-square w-full border-b-2 border-black overflow-hidden bg-gray-100 relative">
            <img 
              src={match.image_url} 
              alt="Found item" 
              className="h-full w-full object-cover filter grayscale group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute top-2 right-2 bg-black text-white font-black px-2 py-1 text-xs">
              {(match.similarity * 100).toFixed(1)}% MATCH
            </div>
          </div>
          <div className="p-5 flex flex-col space-y-4">
            <p className="text-xs font-bold uppercase text-gray-500">
              Recovered {new Date(match.created_at).toLocaleDateString()}
            </p>
            <button className="w-full border-2 border-black bg-white px-4 py-3 text-sm font-black uppercase hover:bg-black hover:text-white transition-colors">
              Claim Identity
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
