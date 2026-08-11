import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-black">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-sm flex flex-col space-y-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Campus Lost and Found</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          A next-generation platform using AI semantic search to instantly connect lost items with found reports.
        </p>
        <div className="flex space-x-4 mt-8">
          <Link 
            href="/login" 
            className="rounded-md bg-black px-6 py-3 text-white hover:bg-gray-800 transition-colors"
          >
            Sign In / Register
          </Link>
        </div>
      </div>
    </main>
  )
}
