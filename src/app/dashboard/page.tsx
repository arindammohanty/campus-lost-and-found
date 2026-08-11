import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NotificationsProvider from '@/components/Notifications'

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  let lostItems: any[] = []
  let foundItems: any[] = []

  try {
    // Attempt to fetch real data. Will gracefully fallback if database is not initialized.
    const { data: lost } = await supabase.from('lost_items').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(4)
    const { data: found } = await supabase.from('found_items').select('*').eq('finder_id', user.id).order('created_at', { ascending: false }).limit(4)
    if (lost) lostItems = lost
    if (found) foundItems = found
  } catch (e) {
    console.error(e)
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono selection:bg-black selection:text-white">
      <NotificationsProvider userId={user.id} />
      
      <header className="border-b-2 border-black py-6 px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Campus L&F</h1>
        <div className="flex items-center space-x-4">
          <div className="text-xs font-bold border border-black px-3 py-1 bg-black text-white">{user.email}</div>
          <Link href="/login" className="text-xs font-bold uppercase hover:underline">Sign Out</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-black border-b-2 border-black pb-2">Actions</h2>
          <Link href="/lost" className="group block p-8 border-2 border-black hover:bg-black hover:text-white transition-all duration-300 relative overflow-hidden">
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Report Lost</h3>
            <p className="text-sm font-medium">Submit a text description. AI will encode and scan the database.</p>
          </Link>
          <Link href="/found" className="group block p-8 border-2 border-black hover:bg-black hover:text-white transition-all duration-300 relative overflow-hidden">
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Report Found</h3>
            <p className="text-sm font-medium">Upload a photo. We extract mathematical features instantly.</p>
          </Link>
        </div>

        <div className="lg:col-span-8 space-y-12">
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-black border-b-2 border-black pb-2 mb-6">Active Reports (Lost)</h2>
            {lostItems.length > 0 ? (
              <div className="space-y-4">
                {lostItems.map(item => (
                  <div key={item.id} className="p-5 border-2 border-black flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                    <div className="flex-1 mr-4">
                      <p className="font-bold text-lg leading-snug break-words">{item.description}</p>
                      <p className="text-xs mt-2 uppercase font-semibold">Reported: {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <Link href={`/lost/${item.id}`} className="text-sm whitespace-nowrap font-black uppercase border-2 border-black px-6 py-3 hover:bg-black hover:text-white transition-colors">
                      View Matches &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 border-2 border-dashed border-black text-center flex flex-col items-center justify-center">
                <p className="text-sm font-bold uppercase">No active lost reports</p>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-black border-b-2 border-black pb-2 mb-6">Contributions (Found)</h2>
            {foundItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {foundItems.map(item => (
                  <div key={item.id} className="border-2 border-black p-3 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                    <div className="aspect-square bg-gray-100 w-full mb-3 overflow-hidden border border-black">
                      <img src={item.image_url} className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-500" alt="Found" />
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold uppercase">ID: {item.id.slice(0, 8)}</p>
                      <p className="text-xs font-bold uppercase">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 border-2 border-dashed border-black text-center flex flex-col items-center justify-center">
                <p className="text-sm font-bold uppercase">No found items reported</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
