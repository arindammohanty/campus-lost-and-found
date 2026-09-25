'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Item, User, ChatMessage } from '../types/portal';
import { getChatMessages, sendChatMessage } from '../utils/portalStorage';
import {
  X,
  Send,
  ShieldCheck,
  Lock,
  UserCheck,
  AlertTriangle,
  Building,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface SecureChatModalProps {
  item: Item;
  currentUser: User;
  onClose: () => void;
  onOpenHandover?: (item: Item) => void;
}

export const SecureChatModal: React.FC<SecureChatModalProps> = ({
  item,
  currentUser,
  onClose,
  onOpenHandover,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = item.userId === currentUser.id;
  const claimantId = currentUser.role === 'helpdesk_admin' || isOwner ? undefined : currentUser.id;
  const role: 'finder' | 'owner' | 'helpdesk' =
    currentUser.role === 'helpdesk_admin'
      ? 'helpdesk'
      : item.type === 'Found'
      ? isOwner
        ? 'finder'
        : 'owner'
      : isOwner
      ? 'owner'
      : 'finder';

  const loadMessages = () => {
    const list = getChatMessages(item.id, claimantId);
    setMessages(list);
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [item.id, claimantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    sendChatMessage(item.id, currentUser, role, text, claimantId);
    setInputText('');
    loadMessages();
  };

  // Quick preset messages for high user convenience
  const quickResponses = [
    'I handed this item to the Central Library Help Desk.',
    'Can you confirm the secret detail to prove ownership?',
    'Let’s meet at the Student Center Reception for handover.',
    'I have generated the official 6-digit Help Desk Handover Pass.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col h-[650px]">
        {/* Chat Header with Privacy Shield Badge */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/80 flex items-center justify-center text-white">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white truncate max-w-xs">{item.title}</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Anonymous & Shielded
                </span>
              </div>
              <p className="text-xs text-slate-300">
                You are chatting as: <strong className="text-indigo-300 capitalize">{role}</strong> ({currentUser.name})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenHandover && (
              <button
                onClick={() => {
                  onClose();
                  onOpenHandover(item);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Handover Pass</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Security Warning Notice Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Personal phone numbers & emails are hidden to protect student privacy.</span>
          </div>
          <span className="text-indigo-600 font-semibold hidden sm:inline">Handover via Campus Help Desk</span>
        </div>

        {/* Chat Messages List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-[#f8fafc]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShieldCheck className="w-12 h-12 text-slate-300 mb-2" />
              <p className="font-bold text-sm text-slate-600">Secure Thread Initialized</p>
              <p className="text-xs max-w-sm mt-1">
                Coordinate item return safely without sharing your personal phone number or social media handles.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser.id;
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="inline-block bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] px-3 py-1 rounded-full font-medium">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                    <span className="font-bold capitalize text-slate-600">
                      {isMe ? 'You' : msg.senderName || msg.senderRole}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Quick:
          </span>
          {quickResponses.map((qr, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qr)}
              className="text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors border border-slate-200"
            >
              {qr}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-4 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            placeholder="Type a secure message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
