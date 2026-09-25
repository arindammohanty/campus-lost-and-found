'use client';

import React, { useState, useEffect } from 'react';
import { Item, User, HandoverTicket } from '../types/portal';
import { CAMPUS_LOCATIONS } from '../data/campusData';
import {
  createHandoverTicket,
  getHandoverTickets,
  verifyHandoverAtDesk,
} from '../utils/portalStorage';
import QRCode from 'qrcode';
import {
  X,
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Building,
  Key,
  Calendar,
  Lock,
  Download,
  Check,
} from 'lucide-react';

interface HandoverModalProps {
  item: Item;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const HandoverModal: React.FC<HandoverModalProps> = ({
  item,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const isHelpDeskOfficer = currentUser.role === 'helpdesk_admin';
  const [activeTab, setActiveTab] = useState<'pass' | 'verify'>(
    isHelpDeskOfficer ? 'verify' : 'pass'
  );

  // Claimant Pass Generation state
  const [secretProof, setSecretProof] = useState('');
  const [selectedDesk, setSelectedDesk] = useState('Central Library Help Desk');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [ticket, setTicket] = useState<HandoverTicket | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Officer Verification Form state - do not prefill with secret handoverCode
  const [inputCode, setInputCode] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const isFinderDepositing = item.type === 'Found' && currentUser.id === item.userId;
  const currentPin = ticket?.handoverCode || item.handoverCode || '482910';

  const handleCopyPin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Check if a ticket already exists for this item
  useEffect(() => {
    const existing = getHandoverTickets().find((t) => t.itemId === item.id);
    if (existing) {
      setTicket(existing);
      generateQRCode(existing.handoverCode);
    } else {
      generateQRCode(item.handoverCode || '482910');
    }
  }, [item.id, item.handoverCode]);

  const generateQRCode = async (code: string) => {
    try {
      const payload = JSON.stringify({
        portal: 'Campus Lost and Found',
        itemId: item.id,
        title: item.title,
        handoverCode: code,
        desk: selectedDesk,
      });
      const url = await QRCode.toDataURL(payload, { width: 220, margin: 1 });
      setQrCodeDataUrl(url);
    } catch (err) {
      console.error('QR code generation failed:', err);
    }
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretProof.trim()) {
      setMessage({ text: 'Please provide proof/secret details to verify ownership.', type: 'error' });
      return;
    }

    const newTicket = createHandoverTicket(item, currentUser, secretProof, selectedDesk);
    setTicket(newTicket);
    generateQRCode(newTicket.handoverCode);
    setMessage({
      text: 'Handover Pass generated! Show this QR Code or 6-digit PIN at the Help Desk.',
      type: 'success',
    });
    onSuccess();
  };

  const handleOfficerVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) {
      setMessage({ text: 'Please enter the 6-digit student handover code.', type: 'error' });
      return;
    }

    const ticketToVerify = ticket || { id: 'ticket-manual' };
    const res = verifyHandoverAtDesk(ticketToVerify.id, inputCode, currentUser.name);

    if (res.success) {
      setMessage({ text: res.message, type: 'success' });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Campus Help Desk Handover</h3>
              <p className="text-xs text-slate-300">
                Official Verification Protocol • Safe Physical Exchange
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

        {/* Tab switch between Student Pass and Help Desk Officer Verification */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('pass')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'pass' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              📱 Student Handover Pass
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'verify' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              👮 Officer Verification Desk
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Item #{item.id.slice(-6)}</span>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {message && (
            <div
              className={`px-4 py-3 rounded-2xl text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {activeTab === 'pass' ? (
            <div className="space-y-4">
              {/* Official Handover Pass Card */}
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldCheck className="w-32 h-32" />
                </div>

                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="inline-block bg-indigo-500/30 text-indigo-300 font-mono text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border border-indigo-400/30">
                    {isFinderDepositing ? '📦 Finder Custody Deposit Pass' : '🎯 Verified Campus Handover Pass'}
                  </span>
                </div>

                <h4 className="text-xl font-black tracking-tight">{item.title}</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Designated Counter: <span className="font-semibold text-white">{ticket?.helpDeskLocation || selectedDesk}</span>
                </p>

                {/* QR Code and 6-Digit Code */}
                <div className="my-5 flex flex-col items-center justify-center">
                  {qrCodeDataUrl ? (
                    <div className="bg-white p-2.5 rounded-2xl shadow-lg inline-block border-4 border-indigo-300/40">
                      <img
                        src={qrCodeDataUrl}
                        alt="Handover QR Code"
                        className="w-36 h-36 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-slate-500" />
                    </div>
                  )}

                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold block mb-1">
                      6-Digit Security Handover PIN
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black font-mono tracking-widest text-amber-400 bg-white/5 px-4 py-1 rounded-xl border border-white/10">
                        {currentPin}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPin}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Copy PIN"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                        <span className="text-[10px]">{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 border-t border-slate-700/60 pt-3">
                  {isFinderDepositing ? 'Depositing Finder' : 'Claimant'}: <strong className="text-white">{currentUser.name}</strong> • Roll:{' '}
                  <span className="font-mono text-indigo-300">{currentUser.rollNumber}</span>
                </div>
              </div>

              {/* Secret Details Proof input if not created yet */}
              {!ticket && (
                <form onSubmit={handleCreateTicket} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Target Campus Help Desk Counter
                    </label>
                    <select
                      value={selectedDesk}
                      onChange={(e) => setSelectedDesk(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="Central Library Help Desk">Central Library Help Desk (Recommended)</option>
                      <option value="Student Center Reception Desk">Student Center Reception Desk</option>
                      <option value="Academic Complex Security Desk">Academic Complex Security Desk</option>
                      <option value="Sports Arena Kiosk">Sports Arena Kiosk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Prove Ownership: Describe your secret detail or distinguishing marks
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Scratched bottom left corner, name written on back, serial number..."
                      value={secretProof}
                      onChange={(e) => setSecretProof(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-colors"
                  >
                    Generate Handover Pass & Notify Desk
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* Officer Verification Mode */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Campus Help Desk Officer Protocol</p>
                  <p className="mt-0.5 text-slate-600">
                    Verify the physical item in your custody with the student&apos;s 6-digit PIN and secret
                    identifying description before releasing the item.
                  </p>
                </div>
              </div>

              {/* Secret Detail inspection box - Restricted to Help Desk Officers */}
              {isHelpDeskOfficer && item.identifyingDetails && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Registered Secret Detail on Record:
                  </span>
                  <p className="text-xs font-semibold text-slate-800">{item.identifyingDetails}</p>
                </div>
              )}

              <form onSubmit={handleOfficerVerification} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Enter Student 6-Digit Handover PIN *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="e.g. 482910"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="w-full text-center text-2xl font-mono font-black tracking-widest py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 uppercase bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Officer Notes / ID Signed</label>
                  <input
                    type="text"
                    placeholder="e.g. Student ID verified in person, item in good condition"
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Validate PIN & Mark Item as Returned
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
