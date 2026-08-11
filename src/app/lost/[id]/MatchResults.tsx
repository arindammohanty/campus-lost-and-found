'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useMultimodalModel } from '@/hooks/useMultimodalModel'

export default function MatchResults({ 
  lostItem 
}: { 
  lostItem: { id: string, description: string, text_embedding: number[] | null } 
}) {
  const supabase = createClient()
  const { isReady, isModelLoading, loadingProgress, generateTextEmbedding } = useMultimodalModel()

  // Detect dummy embedding
  const isDummy = lostItem.text_embedding?.every(val => val === 0)
  const initialEmbedding = isDummy ? null : lostItem.text_embedding

  const [embedding, setEmbedding] = useState<number[] | null>(initialEmbedding)
  const [matches, setMatches] = useState<any[]>([])
  
  // Status states
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [generatingEmbedding, setGeneratingEmbedding] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [error, setError] = useState('')

  const fetchMatches = async (queryEmbedding: number[]) => {
    setLoadingMatches(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('match_found_items', {
        query_embedding: queryEmbedding,
        match_threshold: 0.75,
        match_count: 10
      })

      if (error) throw error
      setMatches(data || [])
      setHasScanned(true)
    } catch (err: any) {
      console.error('Backend match fetch failed', err)
      setError(`Match failed: ${err.message || 'Unknown error'}`)
      setMatches([])
    } finally {
      setLoadingMatches(false)
    }
  }

  // Auto-fetch if we already have an embedding on load
  useEffect(() => {
    if (embedding && !hasScanned && !loadingMatches) {
      fetchMatches(embedding)
    }
  }, [embedding])

  const handleScanClick = async () => {
    if (embedding) {
      // If we already have the embedding (cached in DB), just re-fetch matches
      fetchMatches(embedding)
      return
    }

    if (!isReady) return

    setGeneratingEmbedding(true)
    setError('')
    
    try {
      // Generate embedding using local AI model
      const embeddingArray = await generateTextEmbedding(lostItem.description)
      const newEmbedding = Array.from(embeddingArray)

      // Save to database so we don't have to generate it again
      const { error: updateError } = await supabase
        .from('lost_items')
        .update({ text_embedding: newEmbedding })
        .eq('id', lostItem.id)

      if (updateError) throw updateError

      setEmbedding(newEmbedding)
      // fetchMatches will be triggered by the useEffect automatically
    } catch (err: any) {
      console.error('AI Embedding failed', err)
      setError(`AI Initialization failed: ${err.message || 'Unknown error'}`)
    } finally {
      setGeneratingEmbedding(false)
    }
  }

  if (!embedding && !generatingEmbedding) {
    return (
      <div className="p-12 border-2 border-dashed border-black flex flex-col items-center justify-center text-center space-y-6">
        <div className="max-w-md">
          <h3 className="font-black text-xl uppercase tracking-tight mb-2">Ready to Scan?</h3>
          <p className="text-gray-500 font-medium mb-6">
            Clicking scan will download the AI model into your browser (one-time ~200MB) to extract semantic features from your description and search the database for matches.
          </p>
          <button 
            onClick={handleScanClick}
            disabled={!isReady}
            className="w-full border-2 border-black bg-black px-6 py-4 text-white text-lg font-black uppercase hover:bg-white hover:text-black transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
          >
            {!isReady ? (isModelLoading && loadingProgress ? `Downloading ${loadingProgress.file || 'AI Model'}... ${loadingProgress.progress ? Math.round(loadingProgress.progress) : 0}%` : 'Initializing AI Engine...') : 'Start AI Match Scan'}
          </button>
          {error && <p className="mt-4 text-red-500 font-bold text-sm uppercase">{error}</p>}
        </div>
      </div>
    )
  }

  if (generatingEmbedding) {
    return (
      <div className="p-12 border-2 border-dashed border-black flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold uppercase tracking-widest text-sm animate-pulse">Generating Semantic Profile...</p>
      </div>
    )
  }

  if (loadingMatches) {
    return (
      <div className="p-12 border-2 border-dashed border-black flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        <p className="font-bold uppercase tracking-widest text-sm animate-pulse">Running Neural Network Search...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => fetchMatches(embedding!)}
          className="px-6 py-3 border-2 border-black font-black uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-colors"
        >
          Rescan Database
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-black flex items-center justify-center">
          <p className="font-bold uppercase tracking-widest text-sm text-center">No mathematical correlations found.<br/>Check back later or click Rescan.</p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
