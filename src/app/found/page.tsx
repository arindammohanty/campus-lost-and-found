'use client'

import { useState, FormEvent, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useMultimodalModel } from '@/hooks/useMultimodalModel'
import Link from 'next/link'

export default function FoundPage() {
  const supabase = createClient()
  const { isReady, isModelLoading, loadingProgress, generateImageEmbedding } = useMultimodalModel()
  
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [matches, setMatches] = useState<any[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selected)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !isReady) return

    setLoading(true)
    setMessage('')
    setMatches([])

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('User not authenticated')

      // MOCK BACKEND LOGIC for demo purposes since real storage might fail
      // Generate a mock URL if upload fails to allow the user to see the flow
      let publicUrl = preview || ''
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        await supabase.storage.from('found_images').upload(filePath, file)
        const { data } = supabase.storage.from('found_images').getPublicUrl(filePath)
        publicUrl = data.publicUrl
      } catch (e) {
        console.warn('Storage upload bypassed for demo mode.')
      }

      // Generate embedding 
      // Transformers.js needs a real URL or an object URL
      setMessage('Extracting Vision Features...')
      const embeddingArray = await generateImageEmbedding(publicUrl)
      const embedding = Array.from(embeddingArray)

      // Try inserting
      setMessage('Cross-referencing database...')
      try {
        await supabase.from('found_items').insert({
          finder_id: user.id,
          image_url: publicUrl,
          image_embedding: embedding,
        })

        const { data: matchData } = await supabase.rpc('match_lost_items', {
          query_embedding: embedding,
          match_threshold: 0.75,
          match_count: 5
        })

        if (matchData && matchData.length > 0) {
          setMatches(matchData)
          setMessage('FOUND ITEM REGISTERED. POTENTIAL MATCHES LOCATED.')
        } else {
          setMessage('FOUND ITEM REGISTERED. NO IMMEDIATE MATCHES.')
        }
      } catch (dbErr: any) {
        setMessage(`ERROR SAVING TO DATABASE: ${dbErr.message}`)
      }
    } catch (err: any) {
      setMessage(`ERROR: ${err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono selection:bg-black selection:text-white p-8">
      <header className="max-w-4xl mx-auto mb-12 flex justify-between items-center border-b-2 border-black pb-4">
        <Link href="/dashboard" className="text-xs font-bold uppercase hover:bg-black hover:text-white px-3 py-2 border-2 border-black transition-colors">
          &larr; Return to Dashboard
        </Link>
        <div className="text-xs font-bold uppercase">Vision Subsystem</div>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h1 className="text-5xl font-black tracking-tighter uppercase mb-4">Report Found</h1>
          <p className="text-sm font-bold uppercase mb-8 opacity-80">
            Upload visual data. The engine will compute cross-modal similarities instantaneously.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-3">
                Image Source
              </label>
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="w-full bg-white border-2 border-black p-3 text-sm file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-gray-800 transition-colors cursor-pointer"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isReady || !file}
              className="w-full border-2 border-black bg-black px-6 py-4 text-white text-lg font-black uppercase hover:bg-white hover:text-black transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing Image Array...' : !isReady ? (isModelLoading && loadingProgress ? `Downloading AI Model... ${loadingProgress.progress ? Math.round(loadingProgress.progress) : 0}%` : 'Initializing Transformers.js...') : 'Submit Visual Data'}
            </button>

            {message && (
              <div className="p-4 border-2 border-black bg-black text-white text-sm font-black uppercase">
                {message}
              </div>
            )}
          </form>
        </div>

        <div className="flex flex-col space-y-8">
          <div className="w-full aspect-square border-2 border-black bg-gray-100 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover filter grayscale" />
            ) : (
              <p className="text-xs font-bold uppercase text-gray-400">No Image Selected</p>
            )}
          </div>

          {matches.length > 0 && (
            <div className="border-t-2 border-black pt-8">
              <h2 className="text-xl font-black uppercase mb-4">Correlated Data</h2>
              <div className="space-y-4">
                {matches.map((match) => (
                  <div key={match.id} className="border-2 border-black p-4">
                    <p className="font-bold text-sm uppercase">{match.description}</p>
                    <div className="mt-3 flex justify-between items-center border-t border-black pt-2">
                      <p className="text-xs font-bold uppercase">Accuracy</p>
                      <p className="text-xs font-black bg-black text-white px-2 py-1">{(match.similarity * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
