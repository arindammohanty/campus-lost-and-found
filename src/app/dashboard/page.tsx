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
  let myClaims: any[] = []
  let claimsOnMyItems: any[] = []
  
  // Community Feed
  let allLost: any[] = []
  let allFound: any[] = []

  try {
    const { data: lost } = await supabase.from('lost_items').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    const { data: found } = await supabase.from('found_items').select('*').eq('finder_id', user.id).order('created_at', { ascending: false })
    if (lost) lostItems = lost
    if (found) foundItems = found

    const foundItemIds = foundItems.map(i => i.id)
    const orQuery = foundItemIds.length > 0 
      ? `claimant_id.eq.${user.id},found_item_id.in.(${foundItemIds.join(',')})` 
      : `claimant_id.eq.${user.id}`

    const { data: claims } = await supabase
      .from('claims')
      .select('*, found_item:found_items(*), lost_item:lost_items(*)')
      .or(orQuery)
      .order('created_at', { ascending: false })

    if (claims) {
      myClaims = claims.filter(c => c.claimant_id === user.id)
      claimsOnMyItems = claims.filter(c => foundItemIds.includes(c.found_item_id))
    }

    const { data: lostAll } = await supabase.from('lost_items').select('*').order('created_at', { ascending: false }).limit(20)
    const { data: foundAll } = await supabase.from('found_items').select('*').order('created_at', { ascending: false }).limit(20)
    if (lostAll) allLost = lostAll
    if (foundAll) allFound = foundAll

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
            <form action={async () => {
              'use server'
              const { createClient } = await import('@/utils/supabase/server')
              const supabase = createClient()
              await supabase.auth.signOut()
              const { redirect } = await import('next/navigation')
              redirect('/login')
            }}>
              <button type="submit" className="text-sm font-bold bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors">
                Sign Out
              </button>
            </form>
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
          <Link href="/lost" className="group block relative overflow-hidden rounded-3xl bg-white border border-gray-200 p-8 hover:bg-black hover:text-white hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-black text-white group-hover:bg-white group-hover:text-black rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 className="text-3xl font-bold mb-3 tracking-tight">I Lost Something</h3>
            <p className="text-gray-500 group-hover:text-gray-300 font-medium transition-colors duration-300">Create a new semantic profile for your missing item. The AI will constantly scan new found items.</p>
            <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-widest text-black/50 group-hover:text-white/70 transition-colors duration-300">
              Report Lost Item &rarr;
            </div>
          </Link>

          <Link href="/found" className="group block relative overflow-hidden rounded-3xl bg-black border border-black p-8 hover:bg-white hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-white text-black group-hover:bg-black group-hover:text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3 className="text-3xl font-bold text-white group-hover:text-black mb-3 tracking-tight transition-colors duration-300">I Found Something</h3>
            <p className="text-gray-400 group-hover:text-gray-500 font-medium transition-colors duration-300">Upload a photo to instantly extract visual features and check against active missing item claims.</p>
            <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-widest text-white/50 group-hover:text-black/50 transition-colors duration-300">
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

          {/* My Claims List (As Loser) */}
          {myClaims.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-bold tracking-tight mb-4 border-b border-gray-200 pb-2">Claim Status</h3>
              {myClaims.map(claim => (
                <div key={claim.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative overflow-hidden group">
                   <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${claim.status === 'accepted' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                   <div className="flex flex-col space-y-2">
                     <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Claim on Found Item: {claim.found_item_id.slice(0,8)}</span>
                     <p className="font-semibold text-lg text-gray-900">
                       {claim.status === 'pending' ? 'Waiting for finder to accept...' : 'Finder Accepted!'}
                     </p>
                     {claim.status === 'accepted' && claim.meetup_time && (
                       <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 mt-2">
                         <p className="text-sm font-bold uppercase text-gray-500 mb-1">Meetup Details</p>
                         <p className="text-md font-black text-black">{new Date(claim.meetup_time).toLocaleString()}</p>
                         <p className="text-sm font-medium text-gray-700">Location: {claim.meetup_location}</p>
                       </div>
                     )}
                   </div>
                </div>
              ))}
            </div>
          )}

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

          {/* Claims on My Found Items */}
          {claimsOnMyItems.length > 0 && (
            <div className="mt-8 space-y-4 col-span-1 lg:col-span-2">
              <h3 className="text-xl font-bold tracking-tight mb-4 border-b border-gray-200 pb-2">Action Required: Meetup Scheduler</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {claimsOnMyItems.map(claim => (
                  <div key={claim.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative overflow-hidden group">
                    <div className="flex flex-col space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                           <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Claim on Your Item: {claim.found_item_id.slice(0,8)}</span>
                           <p className="font-semibold text-md text-gray-900 mt-1">
                             Someone claimed your found item!
                           </p>
                        </div>
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${claim.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {claim.status}
                        </span>
                      </div>
                      
                      {claim.status === 'pending' && (
                        <form action={async (formData) => {
                          'use server'
                          const { createClient } = await import('@/utils/supabase/server')
                          const supabase = createClient()
                          const location = formData.get('location')
                          const datetime = formData.get('datetime')
                          await supabase.from('claims').update({
                            status: 'accepted',
                            meetup_location: location,
                            meetup_time: datetime
                          }).eq('id', claim.id)
                        }} className="space-y-4 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <p className="text-xs font-bold uppercase tracking-widest mb-2">Schedule Meetup</p>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                            <select name="location" required className="w-full bg-white border border-gray-300 p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-black">
                              <option value="AryaBhatta">AryaBhatta</option>
                              <option value="Kautlya">Kautlya</option>
                              <option value="Madhusudan">Madhusudan</option>
                              <option value="Main Gate">Main Gate</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Date & Time</label>
                            <input type="datetime-local" name="datetime" required className="w-full bg-white border border-gray-300 p-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-black" />
                          </div>

                          <button type="submit" className="w-full bg-black text-white text-sm font-bold uppercase py-3 rounded-lg hover:bg-gray-800 transition-colors">
                            Accept & Schedule Meetup
                          </button>
                        </form>
                      )}
                      
                      {claim.status === 'accepted' && claim.meetup_time && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200 mt-2">
                           <p className="text-sm font-bold uppercase text-green-700 mb-1">Meetup Scheduled</p>
                           <p className="text-md font-black text-green-900">{new Date(claim.meetup_time).toLocaleString()}</p>
                           <p className="text-sm font-medium text-green-800">Location: {claim.meetup_location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Community Board */}
        <section className="mt-20">
          <header className="mb-10 text-center">
            <h2 className="text-3xl font-black tracking-tight mb-2">Campus Community Board</h2>
            <p className="text-gray-500 text-sm">Recent lost and found reports from around the campus.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* All Lost */}
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                Recently Lost
              </h3>
              <div className="space-y-3">
                {allLost.map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-start space-x-4">
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-gray-900 leading-snug">{item.description}</p>
                      <p className="text-xs text-gray-400 font-medium mt-2">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-md ${item.resolved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.resolved ? 'Resolved' : 'Searching'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* All Found */}
            <div>
              <h3 className="text-lg font-bold tracking-tight mb-6 flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                Recently Found
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {allFound.map(item => (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative">
                    <div className="aspect-square bg-gray-100 relative">
                      <img src={item.image_url} className="w-full h-full object-cover" alt="Found item" />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md shadow-sm backdrop-blur-md ${item.resolved ? 'bg-green-500/90 text-white' : 'bg-white/90 text-black'}`}>
                          {item.resolved ? 'Claimed' : 'Unclaimed'}
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-xs text-gray-900 truncate">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  )
}
