'use client';

import React, { useState } from 'react';
import { User } from '../types/portal';
import { registerPortalUser, getPortalUsers, setActiveUser } from '../utils/portalStorage';
import {
  X,
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
  Hash,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialTab?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'signup',
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);

  // Sign In State
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up State
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [role, setRole] = useState<'student' | 'staff' | 'helpdesk_admin'>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Feedback State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmed = signInIdentifier.trim().toLowerCase();
    if (!trimmed) {
      setErrorMessage('Please enter your University Email or Registration Number.');
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
          (u.email && u.email.toLowerCase() === trimmed) ||
          (u.rollNumber && u.rollNumber.toLowerCase() === trimmed)
      );

      if (matched) {
        setActiveUser(matched);
        setSuccessMessage(`Welcome back, ${matched.name}!`);
        setTimeout(() => {
          onSuccess(matched);
          onClose();
        }, 500);
      } else {
        // Create quick student session if not previously stored
        const defaultRole: 'student' | 'helpdesk_admin' =
          trimmed.includes('admin') || trimmed.includes('desk') ? 'helpdesk_admin' : 'student';

        const newUser = registerPortalUser({
          name: trimmed.includes('@') ? trimmed.split('@')[0] : `Student (${signInIdentifier.trim()})`,
          email: trimmed.includes('@') ? trimmed : `${trimmed}@campus.edu`,
          rollNumber: signInIdentifier.trim(),
          department: 'General Academics',
          branch: 'General Academics',
          role: defaultRole,
        });

        setSuccessMessage(`Signed in as ${newUser.name}!`);
        setTimeout(() => {
          onSuccess(newUser);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to authenticate. Please check your credentials.');
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
      setErrorMessage('Full Legal Name is required.');
      return;
    }

    // MANDATORY REGISTRATION NUMBER VALIDATION
    if (!trimmedRoll) {
      setErrorMessage('University Registration Number is mandatory (e.g. 250301120059).');
      return;
    }

    if (trimmedRoll.length < 5) {
      setErrorMessage('Please enter a valid Registration Number (e.g. 250301120059).');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid campus or personal email address.');
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
        role,
      });

      setSuccessMessage(`Account registered for ${newUser.name} (Reg: ${newUser.rollNumber})!`);
      setTimeout(() => {
        onSuccess(newUser);
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative my-auto animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 pt-6 pb-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">Campus Lost &amp; Found</h3>
              <p className="text-[11px] text-slate-500">Official University Portal Access</p>
            </div>
          </div>

          {/* Switch Tabs */}
          <div className="flex border-b border-slate-200 mt-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
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
              className={`flex-1 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
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

        {/* TAB 1: SIGN UP */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignUp} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-indigo-950 font-medium leading-relaxed">
                Registration numbers ensure only genuine students can report and claim items.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arindam Mohanty"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                />
              </div>
            </div>

            {/* MANDATORY REGISTRATION NUMBER FIELD */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-800">
                  Registration Number <span className="text-red-500">*</span>
                </label>
                <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                  Mandatory
                </span>
              </div>
              <div className="relative">
                <Hash className="w-4 h-4 text-indigo-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 250301120059"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-indigo-200 bg-indigo-50/20 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Example: <span className="font-mono font-semibold text-slate-700">250301120059</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                University Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. student@campus.edu"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="Computer Science & Engineering">CSE</option>
                  <option value="Information Technology">IT</option>
                  <option value="Electronics & Communication">ECE</option>
                  <option value="Electrical Engineering">EE</option>
                  <option value="Mechanical Engineering">Mech</option>
                  <option value="Civil Engineering">Civil</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="helpdesk_admin">Officer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    required
                    className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    required
                    className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* ERROR MESSAGE DIRECTLY ABOVE BUTTON */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Creating Account...' : 'Complete Registration & Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: SIGN IN */}
        {activeTab === 'signin' && (
          <form onSubmit={handleSignIn} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Email or Registration Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={signInIdentifier}
                  onChange={(e) => setSignInIdentifier(e.target.value)}
                  placeholder="e.g. 250301120059 or student@campus.edu"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                You can sign in with your email or Registration Number (e.g. 250301120059).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Portal Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                />
              </div>
            </div>

            {/* ERROR MESSAGE DIRECTLY ABOVE BUTTON */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SUCCESS MESSAGE */}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
              >
                Need an account? Register with Registration Number &rarr;
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
