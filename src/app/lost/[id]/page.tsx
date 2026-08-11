import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MatchResults from './MatchResults'

export default async function LostItemDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  
  let lost_item = null
  
  try {
    const { data, error } = await supabase
      .from('lost_items')
      .select('*')
      .eq('id', params.id)
      .single()
      
    if (data) lost_item = data
  } catch(e) {}

  if (!lost_item) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono selection:bg-black selection:text-white p-8">
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center border-b-2 border-black pb-4">
        <Link href="/dashboard" className="text-xs font-bold uppercase hover:bg-black hover:text-white px-3 py-2 border-2 border-black transition-colors">
          &larr; Return to Dashboard
        </Link>
        <div className="text-xs font-bold uppercase">System: Active</div>
      </header>

      <div className="mx-auto max-w-6xl">
        <h1 className="mb-4 text-4xl font-black uppercase tracking-tighter">Lost Item Details</h1>
        
        <div className="mb-12 border-2 border-black p-8 bg-black text-white">
          <p className="text-xl font-bold leading-relaxed">{lost_item.description}</p>
          <div className="mt-6 flex justify-between items-center text-xs uppercase font-bold border-t border-gray-600 pt-4">
            <span>ID: {lost_item.id}</span>
            <span>Reported: {new Date(lost_item.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        
        <h2 className="mb-8 text-2xl font-black uppercase tracking-widest border-b-2 border-black pb-2">Mathematical Visual Matches</h2>
        <MatchResults textEmbedding={lost_item.text_embedding} />
      </div>
    </div>
  )
}
