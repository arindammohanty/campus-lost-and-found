'use client';

import React from 'react';
import { Item, User, ItemLifecycleStatus } from '../types/portal';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Tag,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

interface ItemDetailsModalProps {
  item: Item;
  currentUser: User;
  onClose: () => void;
  onOpenChat: (item: Item) => void;
  onOpenHandover: (item: Item) => void;
  onOpenMatchRadar: (item: Item) => void;
  onStatusChange?: (itemId: string, status: ItemLifecycleStatus) => void;
}

const LIFECYCLE_STEPS: { status: ItemLifecycleStatus; label: string; sub: string }[] = [
  { status: 'Reported', label: 'Reported', sub: 'Submitted by student' },
  { status: 'Under Review', label: 'Under Review', sub: 'AI feature processing' },
  { status: 'Active', label: 'Active', sub: 'Visible on Campus Radar' },
  { status: 'Match Found', label: 'Match Found', sub: 'Auto-paired by AI' },
  { status: 'In Handover', label: 'In Handover', sub: 'At Campus Help Desk' },
  { status: 'Returned', label: 'Returned', sub: 'Verified & closed' },
];

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  item,
  currentUser,
  onClose,
  onOpenChat,
  onOpenHandover,
  onOpenMatchRadar,
  onStatusChange,
}) => {
  const isOwner = item.userId === currentUser.id;
  const isHelpDesk = currentUser.role === 'helpdesk_admin';
  const isLost = item.type === 'Lost';

  // Get current step index in lifecycle
  const currentStepIndex = LIFECYCLE_STEPS.findIndex((s) => s.status === item.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl shadow-xs ${
                isLost ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {item.type} Item
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">{item.title}</h2>
              <p className="text-xs text-slate-300">
                Tracking ID: <span className="font-mono text-indigo-300">#{item.id}</span> • Reported on{' '}
                {item.date}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Visual Lifecycle Stepper (Direct from CM 2.png) */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" /> Item Lifecycle Status Flow
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  item.status === 'Returned'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.status === 'In Handover'
                    ? 'bg-indigo-100 text-indigo-800'
                    : item.status === 'Match Found'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Current State: {item.status}
              </span>
            </div>

            {/* Stepper Timeline */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isPassed = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div
                    key={step.status}
                    className={`relative rounded-xl p-2.5 text-center transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                        : isPassed
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-white text-slate-400 border border-slate-200'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {isPassed && !isCurrent ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isCurrent ? 'bg-white text-indigo-600' : 'bg-slate-300 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold leading-tight truncate">{step.label}</div>
                    <div
                      className={`text-[9px] mt-0.5 leading-none hidden sm:block ${
                        isCurrent ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                    >
                      {step.sub}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Item Visual & Core Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Image Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video relative shadow-inner">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                {item.aiTags?.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Core Metadata */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500 text-xs">Category:</span>
                <span className="font-bold text-slate-800">{item.category}</span>
                {item.brand && (
                  <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded">
                    Brand: {item.brand}
                  </span>
                )}
                {item.color && (
                  <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded">
                    Color: {item.color}
                  </span>
                )}
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">{item.location}</span>
                  {item.locationDetails && (
                    <p className="text-xs text-slate-500">{item.locationDetails}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{item.date}</span>
                </div>
                {item.time && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{item.time}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </h4>
                <p className="text-slate-700 text-xs leading-relaxed">{item.description}</p>
              </div>

              {/* Handover PIN Display if claimant or owner */}
              {(isOwner || isHelpDesk) && item.handoverCode && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase">
                      Help Desk Handover PIN
                    </span>
                    <p className="text-lg font-black text-indigo-950 font-mono tracking-widest">
                      {item.handoverCode}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenHandover(item)}
                    className="flex items-center gap-1 text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 shadow-xs"
                  >
                    <QrCode className="w-4 h-4" /> View QR Pass
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status Change Fast-Actions for Help Desk Staff / Testing */}
          {isHelpDesk && onStatusChange && (
            <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                🛠️ Help Desk Officer Controls (Direct Status Override)
              </span>
              <div className="flex flex-wrap gap-2">
                {(['Reported', 'Under Review', 'Active', 'Match Found', 'In Handover', 'Returned'] as ItemLifecycleStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => onStatusChange(item.id, st)}
                      className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all ${
                        item.status === st
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Set: {st}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* History Log Timeline (Direct from CM 2.png) */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Full Status History & Audit Log
            </h4>
            <div className="space-y-2">
              {item.historyLog?.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 text-xs bg-slate-50 border border-slate-200/80 rounded-xl p-2.5"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{entry.status}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5">{entry.note}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Actor: {entry.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => onOpenMatchRadar(item)}
            className="flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Check AI Match Radar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChat(item)}
              className="flex items-center gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              Secure In-App Chat
            </button>

            <button
              onClick={() => onOpenHandover(item)}
              className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              <ShieldCheck className="w-4 h-4" />
              Help Desk Handover
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
