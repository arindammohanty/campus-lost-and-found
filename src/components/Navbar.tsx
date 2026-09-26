'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User, PlatformNotification } from '../types/portal';
import { signOutPortalUser } from '../utils/portalStorage';
import {
  Search,
  Bell,
  Plus,
  ShieldCheck,
  User as UserIcon,
  ChevronDown,
  Sparkles,
  Layers,
  MapPin,
  Compass,
  CheckCircle2,
  X,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onSwitchUser?: (user: User) => void;
  onSignOut?: () => void;
  notifications: PlatformNotification[];
  onOpenNotifications: () => void;
  onOpenReportModal: (type: 'Lost' | 'Found') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTab: string;
  onSelectTab: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  onSignOut,
  notifications,
  onOpenNotifications,
  onOpenReportModal,
  searchQuery,
  onSearchChange,
  activeTab,
  onSelectTab,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Slogan */}
          <div
            onClick={() => onSelectTab('explore')}
            className="flex items-center gap-3 cursor-pointer shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-slate-900">
                  Campus <span className="text-indigo-600">Lost &amp; Found</span>
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-md">
                  AI Portal
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Find • Match • Return — A Safer, Smarter Campus
              </p>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search lost &amp; found items, categories, colors..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white rounded-xl text-xs border border-transparent focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right Action Icons & User Status */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action: Report Lost */}
            <button
              onClick={() => onOpenReportModal('Lost')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Lost</span>
            </button>

            {/* Quick Action: Report Found */}
            <button
              onClick={() => onOpenReportModal('Found')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Found</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile or Sign In */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800"
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-white text-[10px] ${
                      currentUser.role === 'helpdesk_admin' ? 'bg-purple-600' : 'bg-indigo-600'
                    }`}
                  >
                    {currentUser.name ? currentUser.name[0] : 'U'}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="leading-tight truncate max-w-[110px]">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal font-mono">
                      {currentUser.role === 'helpdesk_admin' ? 'Help Desk Officer' : currentUser.rollNumber}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* User Dropdown */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-fadeIn">
                    <div className="pb-2.5 mb-2 border-b border-slate-100">
                      <p className="font-bold text-xs text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-indigo-600 font-mono font-bold mt-0.5">
                        Reg: {currentUser.rollNumber}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                      <div className="mt-1.5 inline-block text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {currentUser.role === 'helpdesk_admin' ? 'Campus Officer' : `${currentUser.department || 'Student'}`}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          onSelectTab('my-items');
                          setShowUserDropdown(false);
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-2 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        <span>My Items &amp; Activity</span>
                      </button>

                      <button
                        onClick={() => {
                          signOutPortalUser();
                          setShowUserDropdown(false);
                          if (onSignOut) {
                            onSignOut();
                          } else {
                            window.location.reload();
                          }
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-red-50 text-xs font-medium text-red-600 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm shadow-indigo-600/20"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 text-xs font-semibold">
          {[
            { id: 'explore', label: 'Explore & Search', icon: Search },
            { id: 'map', label: 'Campus Map View', icon: MapPin },
            { id: 'matches', label: 'AI Match Radar', icon: Sparkles },
            { id: 'my-items', label: 'My Items & Activity', icon: Layers },
            { id: 'helpdesk', label: 'Campus Help Desk Handover', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
