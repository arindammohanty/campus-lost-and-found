'use client';

import React, { useState } from 'react';
import { Item, MatchResult, User } from '../types/portal';
import { getSmartMatches } from '../utils/aiEngine';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Calendar,
  MessageSquare,
  QrCode,
  Tag,
  CheckCircle,
  Eye,
  Layers,
  X,
  RotateCcw,
} from 'lucide-react';

interface SmartMatchPanelProps {
  items: Item[];
  currentUser: User;
  onOpenItem: (item: Item) => void;
  onOpenChat: (item: Item) => void;
  onOpenHandover: (item: Item) => void;
  focusedItem?: Item | null;
  onClearFocus?: () => void;
}

export const SmartMatchPanel: React.FC<SmartMatchPanelProps> = ({
  items,
  currentUser,
  onOpenItem,
  onOpenChat,
  onOpenHandover,
  focusedItem,
  onClearFocus,
}) => {
  const [dismissedPairs, setDismissedPairs] = useState<Set<string>>(new Set());

  // If a specific item is selected, find its matches; otherwise get all high-confidence pairs
  const allMatches = getSmartMatches(items, 30);
  const candidateMatches = focusedItem
    ? allMatches.filter(
        (m) => m.lostItem.id === focusedItem.id || m.foundItem.id === focusedItem.id
      )
    : allMatches;

  // Filter out any user-dismissed pairs
  const displayMatches = candidateMatches.filter(
    (m) => !dismissedPairs.has(`${m.lostItem.id}_${m.foundItem.id}`)
  );

  const handleDismiss = (lostId: string, foundId: string) => {
    const pairKey = `${lostId}_${foundId}`;
    setDismissedPairs((prev) => new Set(prev).add(pairKey));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
              AI Visual &amp; Semantic Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Xenova/clip-vit-base-patch32</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Campus AI Match Radar</h2>
          <p className="text-xs text-slate-300 max-w-xl mt-1">
            Multimodal pairing engine continuously cross-references lost item descriptions and found
            item photographs to identify potential owners automatically.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
          <div className="text-right">
            <span className="text-[10px] text-slate-300 uppercase font-semibold block">Active Pairs</span>
            <span className="text-xl font-black text-amber-400">{displayMatches.length} Matches</span>
          </div>
        </div>
      </div>

      {focusedItem && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-indigo-900 font-semibold">
            <Tag className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Showing matches specifically for: <strong className="text-slate-900">&quot;{focusedItem.title}&quot;</strong>
            </span>
          </div>
          {onClearFocus && (
            <button
              onClick={onClearFocus}
              className="text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-100/70 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Show All Campus Matches
            </button>
          )}
        </div>
      )}

      {/* Match Cards List */}
      {displayMatches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800">No High-Confidence Matches Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {dismissedPairs.size > 0
              ? 'You have dismissed previous matches for these items.'
              : 'As students report more lost and found items with photos across campus, our CLIP multimodal AI will automatically flag similar listings here.'}
          </p>
          {dismissedPairs.size > 0 && (
            <button
              onClick={() => setDismissedPairs(new Set())}
              className="mt-3 text-xs font-bold text-indigo-600 hover:underline"
            >
              Reset Dismissed Matches
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayMatches.map((match, idx) => {
            const isVeryHigh = match.score >= 80;
            const isHigh = match.score >= 60;

            return (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                {/* Score Top Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl shadow-xs flex items-center gap-1.5 ${
                        isVeryHigh
                          ? 'bg-emerald-600 text-white'
                          : isHigh
                          ? 'bg-indigo-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {match.score}% AI Match Confidence
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Pair #{idx + 1}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenChat(match.lostItem)}
                      className="text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat Finder/Owner
                    </button>
                    <button
                      onClick={() => onOpenHandover(match.foundItem)}
                      className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Help Desk Handover
                    </button>
                    <button
                      onClick={() => handleDismiss(match.lostItem.id, match.foundItem.id)}
                      title="Dismiss false positive match"
                      className="text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-xl transition-colors border border-transparent hover:border-red-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Side-by-Side Comparison (Lost Item vs Found Item) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  {/* Lost Item Summary */}
                  <div
                    onClick={() => onOpenItem(match.lostItem)}
                    className="cursor-pointer bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-4 transition-colors flex items-start gap-4"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                      <img
                        src={match.lostItem.imageUrl}
                        alt={match.lostItem.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.2 rounded-md">
                          Lost Report
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {match.lostItem.date}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {match.lostItem.title}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        {match.lostItem.location}
                      </p>
                      <div className="text-[10px] text-indigo-600 font-semibold mt-1">
                        Owner: {match.lostItem.userName}
                      </div>
                    </div>
                  </div>

                  {/* Found Item Summary */}
                  <div
                    onClick={() => onOpenItem(match.foundItem)}
                    className="cursor-pointer bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl p-4 transition-colors flex items-start gap-4"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                      <img
                        src={match.foundItem.imageUrl}
                        alt={match.foundItem.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.2 rounded-md">
                          Found Report
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {match.foundItem.date}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {match.foundItem.title}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {match.foundItem.location}
                      </p>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-1">
                        Reported by: {match.foundItem.userName}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Explanation Pill Reasons */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    AI Multimodal Matching Factors:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {match.reasons.map((reason, rIdx) => (
                      <span
                        key={rIdx}
                        className="text-xs font-medium bg-indigo-50/70 text-indigo-900 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3 text-indigo-600 shrink-0" />
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
