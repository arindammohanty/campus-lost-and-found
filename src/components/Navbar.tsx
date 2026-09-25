'use client';

import React, { useState } from 'react';
import { User, PlatformNotification } from '../types/portal';
import { SAMPLE_USERS } from '../data/campusData';
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
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
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
                  Campus <span className="text-indigo-600">Lost & Found</span>
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
              placeholder="Search lost & found items, categories, colors..."
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

          {/* Right Action Icons & User Switcher */}
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

            {/* Active User Switcher Pill (Great for Instant Testing) */}
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
                  {currentUser.name[0]}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="leading-tight truncate max-w-[110px]">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {currentUser.role === 'helpdesk_admin' ? 'Help Desk Officer' : currentUser.rollNumber}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Switcher Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Switch Test User Persona
                  </div>
                  <div className="space-y-1 mt-1">
                    {SAMPLE_USERS.map((u) => {
                      const isActive = u.id === currentUser.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u);
                            setShowUserDropdown(false);
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs transition-colors ${
                            isActive ? 'bg-indigo-50 text-indigo-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <p className="font-semibold">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.role === 'helpdesk_admin' ? 'Help Desk Admin' : u.rollNumber}</p>
                          </div>
                          {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  isCurrent
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
