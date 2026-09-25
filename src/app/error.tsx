'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Campus Portal Error Caught:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center bg-[#f8fafc]">
      <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow-md">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
        An unexpected error occurred while loading this page. You can try refreshing the view or return to the main campus portal.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-xs flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Campus Home
        </Link>
      </div>
    </div>
  );
}
