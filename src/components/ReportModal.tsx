'use client';

import React, { useState } from 'react';
import { ItemType, CategoryType, ContactPreference, User } from '../types/portal';
import { CATEGORIES, CAMPUS_LOCATIONS } from '../data/campusData';
import { CampusMap } from './CampusMap';
import { extractAIFeatures } from '../utils/aiEngine';
import {
  X,
  Upload,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Sparkles,
  Check,
  AlertCircle,
  MessageSquare,
  Mail,
  Smartphone,
  Tag,
  Wand2,
} from 'lucide-react';

interface ReportModalProps {
  initialType?: ItemType;
  currentUser: User;
  onClose: () => void;
  onSubmit: (itemData: any) => void;
}

const PRESET_ITEMS = [
  {
    name: 'Scientific Calculator',
    type: 'Lost',
    category: 'Electronics' as CategoryType,
    color: 'Black',
    brand: 'Casio',
    description: 'Casio fx-991CW with barcode sticker',
    img: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&q=80&w=800',
    secret: 'Silver initials sticker on back lid',
  },
  {
    name: 'College ID Card',
    type: 'Lost',
    category: 'ID Cards' as CategoryType,
    color: 'Navy Blue',
    brand: 'RFID Campus',
    description: 'Student Identity smartcard with blue lanyard',
    img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800',
    secret: 'Transparent sticker over barcode',
  },
  {
    name: 'Hostel Keys',
    type: 'Found',
    category: 'Keys' as CategoryType,
    color: 'Silver',
    brand: 'Godrej',
    description: 'Set of 3 brass keys with Spider-Man keychain',
    img: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&q=80&w=800',
    secret: 'Room number 214 etched on one key',
  },
  {
    name: 'Water Bottle',
    type: 'Found',
    category: 'Accessories' as CategoryType,
    color: 'Blue',
    brand: 'Milton',
    description: 'Milton 750ml insulated thermos flask',
    img: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=800',
    secret: 'Slight dent on the lower rim',
  },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  initialType = 'Lost',
  currentUser,
  onClose,
  onSubmit,
}) => {
  const [type, setType] = useState<ItemType>(initialType);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Info & Map, Step 2: Photo & Contact

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryType>('Electronics');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(CAMPUS_LOCATIONS[1].name); // Default Central Library
  const [locationDetails, setLocationDetails] = useState('');
  const [mapPin, setMapPin] = useState<{ x: number; y: number; locationName: string }>({
    x: CAMPUS_LOCATIONS[1].mapX,
    y: CAMPUS_LOCATIONS[1].mapY,
    locationName: CAMPUS_LOCATIONS[1].name,
  });
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('02:00 PM');
  const [contactPreference, setContactPreference] = useState<ContactPreference>('In-App Chat');
  const [identifyingDetails, setIdentifyingDetails] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Handle local file upload with instant base64 preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        setError('');
        // Trigger quick AI feature suggestion
        triggerAiAssist(title, description);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1-Click quick preset applicator for ultimate student convenience
  const applyPreset = (preset: typeof PRESET_ITEMS[0]) => {
    setTitle(preset.name);
    setCategory(preset.category);
    setColor(preset.color);
    setBrand(preset.brand);
    setDescription(preset.description);
    setImageUrl(preset.img);
    setIdentifyingDetails(preset.secret);
  };

  // Smart AI Feature Detection trigger
  const triggerAiAssist = (t: string, d: string) => {
    if (!t && !d) return;
    setIsAiAnalyzing(true);
    setTimeout(() => {
      const extracted = extractAIFeatures(t, d);
      if (extracted.category) setCategory(extracted.category);
      if (extracted.color && !color) setColor(extracted.color);
      if (extracted.brand && !brand) setBrand(extracted.brand);
      setIsAiAnalyzing(false);
    }, 350);
  };

  const handleLocationSelectedOnMap = (locName: string, coords: { x: number; y: number }) => {
    setLocation(locName);
    setMapPin({ x: coords.x, y: coords.y, locationName: locName });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide an item title and description.');
      return;
    }

    onSubmit({
      type,
      title: title.trim(),
      category,
      color: color.trim(),
      brand: brand.trim(),
      description: description.trim(),
      location,
      locationDetails: locationDetails.trim(),
      mapX: mapPin.x,
      mapY: mapPin.y,
      date,
      time,
      contactPreference,
      identifyingDetails: identifyingDetails.trim(),
      imageUrl: imageUrl || (type === 'Found'
        ? 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&q=80&w=800'
        : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800'),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
                type === 'Lost' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {type === 'Lost' ? 'LOST' : 'FOUND'}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Report {type === 'Lost' ? 'a Lost Item' : 'a Found Item'}
              </h2>
              <p className="text-xs text-slate-300">
                Official Campus Portal • Multi-Factor AI Matching & Help Desk Handover
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

        {/* Tab Toggle: Lost vs Found & 1-Click Convenience */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('Lost')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'Lost' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔍 I Lost Something
            </button>
            <button
              type="button"
              onClick={() => setType('Found')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                type === 'Found' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📦 I Found Something
            </button>
          </div>

          {/* Quick Demo Presets for Speed */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Fast Fill:
            </span>
            {PRESET_ITEMS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-[11px] font-medium bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 border border-slate-200 px-2 py-0.8 rounded-md transition-colors whitespace-nowrap"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Item Core Details */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" /> 1. Item Information
              </h3>
              {isAiAnalyzing && (
                <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 animate-pulse">
                  <Wand2 className="w-3.5 h-3.5" /> AI analyzing attributes...
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Casio fx-991CW Scientific Calculator"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    triggerAiAssist(e.target.value, description);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CategoryType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Color</label>
                  <input
                    type="text"
                    placeholder="e.g. Black, Silver"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Casio, Apple"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Provide physical details, distinctive marks, stickers, case type..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    triggerAiAssist(title, e.target.value);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Interactive Campus Map & Location */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-indigo-600" /> 2. Location on Campus Map (Click Pin to Select)
            </h3>

            {/* Embedded Interactive Campus Map in Picker Mode */}
            <div className="mb-3">
              <CampusMap
                pickerMode={true}
                currentPin={mapPin}
                selectedLocation={location}
                onSelectLocation={handleLocationSelectedOnMap}
                heightClass="h-[280px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Zone / Building *
                </label>
                <select
                  value={location}
                  onChange={(e) => {
                    const loc = CAMPUS_LOCATIONS.find((l) => l.name === e.target.value);
                    if (loc) {
                      setLocation(loc.name);
                      setMapPin({ x: loc.mapX, y: loc.mapY, locationName: loc.name });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                >
                  {CAMPUS_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Spot / Room Details
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2nd Floor Study Desk 14, Table near water dispenser"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date {type === 'Lost' ? 'Lost' : 'Found'} *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Approximate Time</label>
                <input
                  type="text"
                  placeholder="e.g. 02:30 PM"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Photo Upload & Secret Ownership Detail */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-indigo-600" /> 3. Photo & Ownership Verification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Photo</label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-indigo-500 transition-colors bg-slate-50/50">
                  {imageUrl ? (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img src={imageUrl} alt="Uploaded item" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-2 right-2 bg-slate-900/80 text-white rounded-full p-1 hover:bg-slate-900"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">Drop an image or click to browse</p>
                      <p className="text-[11px] text-slate-400 mt-1">PNG, JPG or WEBP up to 5MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="modal-image-upload"
                      />
                      <label
                        htmlFor="modal-image-upload"
                        className="mt-2 inline-block px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-600 cursor-pointer hover:bg-slate-50 shadow-xs"
                      >
                        Choose File
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Private / Secret Identifying Detail (Crucial for Handover Verification)
                </label>
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 mb-2">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 leading-tight">
                      This secret detail is <strong>never made public</strong>. It is kept hidden and
                      only verified by the Campus Help Desk Officer or claimant to prove ownership!
                    </p>
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="e.g. Scratched serial number ending in 89, specific sticker on the battery cover..."
                  value={identifyingDetails}
                  onChange={(e) => setIdentifyingDetails(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Contact Preference */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-600" /> 4. Contact & Alert Preference
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'In-App Chat',
                  label: 'In-App Secure Chat',
                  desc: 'Recommended: Safe, anonymous messaging without sharing phone numbers.',
                  icon: MessageSquare,
                },
                {
                  id: 'Email Alerts',
                  label: 'University Email',
                  desc: 'Instant notifications sent to your official campus inbox.',
                  icon: Mail,
                },
                {
                  id: 'SMS Alerts',
                  label: 'Mobile SMS',
                  desc: 'High-priority SMS alerts when a high-probability match is found.',
                  icon: Smartphone,
                },
              ].map((pref) => {
                const Icon = pref.icon;
                const isSelected = contactPreference === pref.id;
                return (
                  <div
                    key={pref.id}
                    onClick={() => setContactPreference(pref.id as ContactPreference)}
                    className={`cursor-pointer border p-3.5 rounded-2xl transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-200'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold text-slate-800">{pref.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{pref.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Posting as: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.rollNumber})
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-950 shadow-md transition-all ${
                  type === 'Lost'
                    ? 'bg-amber-500 hover:bg-amber-400'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                }`}
              >
                Submit {type} Report & Auto-Scan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
