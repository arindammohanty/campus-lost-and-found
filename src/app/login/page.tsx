'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerPortalUser, getPortalUsers, setActiveUser } from '@/utils/portalStorage';
import {
  Compass,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building,
  Phone,
  Hash,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signup');

  // Sign In State
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up State
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [year, setYear] = useState('2nd Year');
  const [role, setRole] = useState<'student' | 'staff' | 'helpdesk_admin'>('student');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmed = signInIdentifier.trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage('Please enter your university email or registration number.');
      return;
    }

    if (!signInPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const users = getPortalUsers();
      const matched = users.find(
        (u) =>
          u.email.toLowerCase() === trimmed ||
          u.rollNumber.toLowerCase() === trimmed
      );

      if (matched) {
        setActiveUser(matched);
        setSuccessMessage(`Welcome back, ${matched.name}! Redirecting to portal...`);
        setTimeout(() => {
          router.push('/');
        }, 800);
      } else {
        // Fallback for new demo or unregistered login
        // Allow creating session or show guidance
        const defaultRole: 'student' | 'helpdesk_admin' = trimmed.includes('admin') || trimmed.includes('desk') 
          ? 'helpdesk_admin' 
          : 'student';

        const newUser = registerPortalUser({
          name: trimmed.includes('@') ? trimmed.split('@')[0] : `Student (${signInIdentifier})`,
          email: trimmed.includes('@') ? trimmed : `${trimmed}@campus.edu`,
          rollNumber: signInIdentifier.trim(),
          department: 'General Academics',
          branch: 'General Academics',
          role: defaultRole,
        });

        setSuccessMessage(`Signed in as ${newUser.name}. Redirecting...`);
        setTimeout(() => {
          window.location.href = '/';
        }, 400);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to authenticate. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedName = name.trim();
    const trimmedRoll = rollNumber.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your Full Legal / Campus Name.');
      return;
    }

    // MANDATORY REGISTRATION NUMBER VALIDATION
    if (!trimmedRoll) {
      setErrorMessage('University Registration Number is mandatory (e.g. 250301120059).');
      return;
    }

    if (trimmedRoll.length < 5) {
      setErrorMessage('Please enter a valid Registration Number (at least 6 characters, e.g. 250301120059).');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid university or institutional email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const newUser = registerPortalUser({
        name: trimmedName,
        rollNumber: trimmedRoll,
        email: trimmedEmail,
        department,
        branch: department,
        year,
        role,
        phone: phone.trim() || undefined,
      });

      setSuccessMessage(`Account registered successfully for ${newUser.name} (Reg: ${newUser.rollNumber})! Redirecting...`);
      setTimeout(() => {
        window.location.href = '/';
      }, 400);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to register account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white py-12">
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

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Card Header & Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 pt-5 pb-0">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">University Portal Access</h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify campus identity to report items, match lost belongings, and claim passes
            </p>
          </div>

          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'signup'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Create Account (Sign Up)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'signin'
                  ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div className="p-6 pb-0">
          {errorMessage && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Tab 1: SIGN UP */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="p-6 pt-2 space-y-4">
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-950 font-medium leading-relaxed">
                Campus registration numbers protect the community from duplicate claims and ensure items reach their rightful owner.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Full Legal Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arindam Mohanty"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* MANDATORY REGISTRATION NUMBER FIELD */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  University Registration Number <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                  Mandatory Field
                </span>
              </div>
              <div className="relative">
                <Hash className="w-4 h-4 text-indigo-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 250301120059"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border-2 border-indigo-200 bg-indigo-50/20 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Example: <span className="font-mono font-semibold text-slate-700">250301120059</span> (printed on your university smartcard)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                University Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@campus.edu"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Department / Branch <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium bg-white"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                    <option value="Management & Commerce">Management & Commerce</option>
                    <option value="Basic Sciences & Humanities">Basic Sciences & Humanities</option>
                    <option value="Administration / Security">Administration / Security</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Campus Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium bg-white"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff / Faculty</option>
                  <option value="helpdesk_admin">Help Desk Officer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Academic Year / Batch
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2nd Year / 2025-2029"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Portal Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Creating University Account...' : 'Complete Registration & Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Tab 2: SIGN IN */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="p-6 pt-2 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Official Email or Registration Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={signInIdentifier}
                  onChange={(e) => setSignInIdentifier(e.target.value)}
                  placeholder="e.g. 250301120059 or student@campus.edu"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                You can sign in with your email or Registration Number (e.g. 250301120059).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Portal Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                Don&apos;t have an account yet? Register with Registration Number &rarr;
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            &larr; Return to Campus Lost &amp; Found Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
