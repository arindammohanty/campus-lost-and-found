import { login, signup } from './actions'

export default function LoginPage({ searchParams }: { searchParams: { error: string } }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 text-black">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-300 shadow-xl bg-white">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-xl font-semibold text-gray-900">Sign In</h3>
          <p className="text-sm text-gray-600">
            Use your email and password to sign in
          </p>
        </div>
        <form className="flex flex-col space-y-4 bg-white px-4 py-8 sm:px-16">
          {searchParams?.error && (
            <p className="text-center text-sm font-medium text-red-600">
              {searchParams.error}
            </p>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-gray-700 uppercase"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue="250301120059@centurionuniv.edu.in"
              placeholder="user@university.edu"
              autoComplete="email"
              required
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-black placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-gray-700 uppercase"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              defaultValue="Am@HIG425"
              required
              className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-black placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
          <button
            formAction={login}
            className="flex h-10 w-full items-center justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            Log in
          </button>
          <button
            formAction={signup}
            className="flex h-10 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
          >
            Sign up
          </button>
        </form>
      </div>
    </div>
  )
}
