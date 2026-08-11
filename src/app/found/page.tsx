'use client'

import { useState, FormEvent, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useMultimodalModel } from '@/hooks/useMultimodalModel'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { revalidateDashboard } from '@/app/actions'

export default function FoundPage() {
  const router = useRouter()
  const supabase = createClient()
  const { isReady, isModelLoading, loadingProgress, generateTextEmbedding } = useMultimodalModel()
  
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
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
    if (!file || !description || !isReady) return

    setLoading(true)
    setMessage('')

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('User not authenticated')

      let publicUrl = ''
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage.from('found_images').upload(filePath, file)
      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}. Did you create the 'found_images' storage bucket?`)
      
      const { data } = supabase.storage.from('found_images').getPublicUrl(filePath)
      publicUrl = data.publicUrl

      // Generate embedding from text description instead of image to save processing time
      setMessage('Generating Semantic Profile...')
      const embeddingArray = await generateTextEmbedding(description)
      const embedding = Array.from(embeddingArray)

      // Try inserting
      setMessage('Cross-referencing database...')
      try {
        const { error: insertError } = await supabase.from('found_items').insert({
          finder_id: user.id,
          image_url: publicUrl,
          description: description,
          text_embedding: embedding,
        })
        
        if (insertError) throw insertError

        setMessage('FOUND ITEM REGISTERED SUCCESSFULLY. REDIRECTING...')
        
        // Refresh Next.js client cache and redirect
        await revalidateDashboard()
        router.refresh()
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
        
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
            Upload visual data and describe it. We use semantic text matching for speed, but the image proves validity.
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

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-3">
                Item Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={4}
                placeholder="E.g. Black iPhone 13 with a cracked screen protector..."
                className="w-full bg-white border-2 border-black p-4 text-sm font-bold uppercase placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all resize-none"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !isReady || !file || !description}
              className="w-full border-2 border-black bg-black px-6 py-4 text-white text-lg font-black uppercase hover:bg-white hover:text-black transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing Data...' : !isReady ? (isModelLoading && loadingProgress ? `Downloading ${loadingProgress.file || 'AI Model'}... ${loadingProgress.progress ? Math.round(loadingProgress.progress) : 0}%` : 'Initializing AI Engine...') : 'Submit Record'}
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

        </div>
      </div>
    </div>
  )
}
