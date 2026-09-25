'use client';

import React from 'react';
import { PlatformNotification, Item } from '../types/portal';
import { X, Bell, Sparkles, MessageSquare, ShieldCheck, Check, Trash2 } from 'lucide-react';

interface NotificationsModalProps {
  notifications: PlatformNotification[];
  onClose: () => void;
  onItemClick: (itemId: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onClose,
  onItemClick,
  onMarkAllRead,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Campus Alerts & Updates</h3>
              <p className="text-[11px] text-slate-300">Live AI match notifications</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <span>{notifications.length} alerts received</span>
          <button
            onClick={onMarkAllRead}
            className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
          >
            Mark all read
          </button>
        </div>

        {/* List of Notifications */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-slate-50/50">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-xs text-slate-600">All caught up!</p>
              <p className="text-[11px] mt-0.5">No new alerts at this time.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isMatch = notif.type === 'match';
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (notif.itemId) onItemClick(notif.itemId);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    notif.read
                      ? 'bg-white border-slate-200 opacity-75'
                      : 'bg-white border-indigo-200 ring-2 ring-indigo-50 shadow-xs'
                  } hover:bg-slate-50`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isMatch
                          ? 'bg-purple-100 text-purple-700'
                          : notif.type === 'chat'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isMatch ? (
                        <Sparkles className="w-3.5 h-3.5" />
                      ) : notif.type === 'chat' ? (
                        <MessageSquare className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{notif.title}</h4>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(notif.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{notif.message}</p>
                      {notif.itemId && (
                        <span className="inline-block mt-1.5 text-[10px] font-bold text-indigo-600 hover:underline">
                          Tap to view item details &rarr;
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
