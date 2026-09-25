'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SAMPLE_USERS } from '@/data/campusData';
import { setActiveUser } from '@/utils/portalStorage';
import { login, signup } from './actions';
import {
  Compass,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickDemoLogin = (user: typeof SAMPLE_USERS[0]) => {
    setActiveUser(user);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-2 group">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <span className="font-black text-2xl tracking-tight text-white">
            Campus <span className="text-indigo-400">Lost &amp; Found</span>
          </span>
        </Link>
        <p className="text-xs text-slate-300 font-medium">
          Official University Single Sign-On • Safe, Smart Campus Recovery
        </p>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Card Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 text-center">
          <h2 className="text-xl font-bold text-slate-900">University Portal Sign In</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access your lost item reports, smart AI matches, and help desk passes
          </p>
        </div>

        {/* 1-Click Fast Student Sign-In for Immediate Convenience */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>1-Click Instant Persona Sign-In:</span>
          </div>

          <div className="space-y-2">
            {SAMPLE_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickDemoLogin(u)}
                className="w-full p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/60 transition-all flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-white text-xs ${
                      u.role === 'helpdesk_admin' ? 'bg-purple-600' : 'bg-indigo-600'
                    }`}
                  >
                    {u.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                      {u.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {u.role === 'helpdesk_admin' ? 'Campus Help Desk Officer' : `${u.rollNumber} • ${u.branch}`}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-semibold text-[10px]">
                Or enter university credentials
              </span>
            </div>
          </div>
        </div>

        {/* Credentials Form */}
        <form
          action={login}
          className="px-6 pb-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Official University Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Portal Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition-colors"
            >
              Sign In
            </button>
            <button
              type="submit"
              formAction={signup}
              className="px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-colors"
            >
              Register
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            &larr; Return to Campus Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
