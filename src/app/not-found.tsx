import React from 'react';
import Link from 'next/link';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center bg-[#f8fafc]">
      <div className="w-16 h-16 rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-md">
        <Compass className="w-8 h-8" />
      </div>
      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1 block">
        404 • Page Not Found
      </span>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
        Lost On Campus?
      </h2>
      <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
        The item or page you are looking for does not exist or has been relocated. Check the campus lost &amp; found radar or explore active listings.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Portal
        </Link>
      </div>
    </div>
  );
}
