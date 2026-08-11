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
    const { data: lost } = await supabase.from('lost_items').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    const { data: found } = await supabase.from('found_items').select('*').eq('finder_id', user.id).order('created_at', { ascending: false })
    if (lost) lostItems = lost
    if (found) foundItems = found
  } catch (e) {
    console.error('Failed to fetch dashboard data', e)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] font-sans selection:bg-black selection:text-white">
      <NotificationsProvider userId={user.id} />
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xl leading-none tracking-tighter">L</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Campus<span className="text-gray-400">LF</span></h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-sm font-medium text-gray-500 hidden md:block">{user.email}</div>
            <Link href="/login" className="text-sm font-bold bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors">
              Sign Out
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Welcome Section */}
        <header className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-5xl font-black tracking-tight mb-4">Command Center</h2>
          <p className="text-gray-500 text-lg">
            Manage your lost items and track items you've found. Our AI automatically cross-references all reports in the background.
          </p>
        </header>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link href="/lost" className="group block relative overflow-hidden rounded-3xl bg-white border border-gray-200 p-8 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-bl-[100px] -z-10 group-hover:bg-black transition-colors duration-500"></div>
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 className="text-3xl font-bold mb-3 tracking-tight group-hover:text-black">I Lost Something</h3>
            <p className="text-gray-500 font-medium">Create a new semantic profile for your missing item. The AI will constantly scan new found items.</p>
            <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-widest text-black/50 group-hover:text-black transition-colors">
              Report Lost Item &rarr;
            </div>
          </Link>

          <Link href="/found" className="group block relative overflow-hidden rounded-3xl bg-black border border-black p-8 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-900 rounded-bl-[100px] -z-10 group-hover:bg-white transition-colors duration-500"></div>
            <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3 className="text-3xl font-bold text-white mb-3 tracking-tight group-hover:text-black">I Found Something</h3>
            <p className="text-gray-400 font-medium group-hover:text-gray-600 transition-colors">Upload a photo to instantly extract visual features and check against active missing item claims.</p>
            <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-widest text-white/50 group-hover:text-black transition-colors">
              Report Found Item &rarr;
            </div>
          </Link>
        </div>

        {/* Dashboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Lost Items Dashboard */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-500 mr-3"></span>
                My Active Claims
              </h2>
              <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{lostItems.length}</span>
            </div>
            
            {lostItems.length > 0 ? (
              <div className="space-y-4">
                {lostItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gray-200 group-hover:bg-black transition-colors"></div>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-6">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${item.resolved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.resolved ? 'Resolved' : 'Searching'}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="font-semibold text-lg text-gray-900 leading-snug break-words mb-4">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
                      <Link href={`/lost/${item.id}`} className="flex-1 bg-black text-white text-center py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors">
                        View Match Radar
                      </Link>
                      {!item.resolved && (
                        <form action={async () => {
                          'use server'
                          const { createClient } = await import('@/utils/supabase/server')
                          const supabase = createClient()
                          await supabase.from('lost_items').update({ resolved: true }).eq('id', item.id)
                        }}>
                          <button type="submit" className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-green-100 hover:text-green-700 transition-colors">
                            Mark Found
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Active Claims</h3>
                <p className="text-gray-500 text-sm">You haven't reported any lost items yet.</p>
              </div>
            )}
          </section>

          {/* Found Items Dashboard */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold tracking-tight flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-3"></span>
                My Found Contributions
              </h2>
              <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{foundItems.length}</span>
            </div>

            {foundItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {foundItems.map(item => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                      <img src={item.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Found item" />
                      <div className="absolute top-3 left-3">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md shadow-sm backdrop-blur-md ${item.resolved ? 'bg-green-500/90 text-white' : 'bg-white/90 text-black'}`}>
                          {item.resolved ? 'Claimed' : 'Unclaimed'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold uppercase text-gray-400">ID: {item.id.slice(0, 8)}</span>
                        <span className="text-[10px] font-bold uppercase text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      {!item.resolved && (
                        <form action={async () => {
                          'use server'
                          const { createClient } = await import('@/utils/supabase/server')
                          const supabase = createClient()
                          await supabase.from('found_items').update({ resolved: true }).eq('id', item.id)
                        }} className="mt-2">
                          <button type="submit" className="w-full py-2 bg-gray-50 hover:bg-green-50 text-gray-600 hover:text-green-600 text-xs font-bold rounded-lg transition-colors border border-gray-200 hover:border-green-200">
                            Mark as Claimed
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Contributions</h3>
                <p className="text-gray-500 text-sm">Help the community by reporting found items.</p>
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  )
}
