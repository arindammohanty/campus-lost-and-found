'use client';

import React from 'react';
import { Item, User } from '../types/portal';
import { MapPin, Calendar, Clock, Sparkles, MessageSquare, ShieldCheck, Tag } from 'lucide-react';

interface ItemCardProps {
  item: Item;
  currentUser: User | null;
  onOpenDetails: (item: Item) => void;
  onOpenChat: (item: Item) => void;
  onOpenHandover: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  currentUser,
  onOpenDetails,
  onOpenChat,
  onOpenHandover,
}) => {
  const isLost = item.type === 'Lost';
  const isOwner = currentUser ? item.userId === currentUser.id : false;

  const getStatusBadge = () => {
    switch (item.status) {
      case 'Returned':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'In Handover':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Match Found':
        return 'bg-purple-100 text-purple-800 border-purple-200 animate-pulse';
      case 'Active':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div
      onClick={() => onOpenDetails(item)}
      className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col group"
    >
      {/* Item Image with Type & Status Overlays */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Type Badge (Top Left) */}
        <div className="absolute top-3 left-3">
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-md ${
              isLost ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
            }`}
          >
            {item.type}
          </span>
        </div>

        {/* Lifecycle Status Pill (Top Right) */}
        <div className="absolute top-3 right-3">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-md border backdrop-blur-md ${getStatusBadge()}`}
          >
            {item.status}
          </span>
        </div>

        {/* AI Tag Overlay (Bottom Left) */}
        {item.aiTags && item.aiTags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
              {item.aiTags[0]}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Date */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
            <span className="text-indigo-600 font-semibold">{item.category}</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{item.date}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {item.title}
          </h3>

          {/* Description snippet */}
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Location & Action Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate">
            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate font-medium">{item.location.split('/')[0]}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onOpenChat(item)}
              title="Open In-App Secure Chat"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenHandover(item)}
              title="Handover Verification Pass"
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
