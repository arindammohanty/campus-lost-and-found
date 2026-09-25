'use client';

import React, { useState } from 'react';
import { Item, CampusLocation } from '../types/portal';
import { CAMPUS_LOCATIONS } from '../data/campusData';
import { MapPin, Navigation, Compass, Layers, ShieldCheck, Eye, Sparkles } from 'lucide-react';

interface CampusMapProps {
  items?: Item[];
  selectedLocation?: string;
  onSelectLocation?: (locationName: string, coords: { x: number; y: number }) => void;
  onItemClick?: (item: Item) => void;
  pickerMode?: boolean; // If true, clicking places/selects a pin
  currentPin?: { x: number; y: number; locationName: string };
  heightClass?: string;
}

export const CampusMap: React.FC<CampusMapProps> = ({
  items = [],
  selectedLocation,
  onSelectLocation,
  onItemClick,
  pickerMode = false,
  currentPin,
  heightClass = 'h-[520px]',
}) => {
  const [hoveredBuilding, setHoveredBuilding] = useState<CampusLocation | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<CampusLocation | null>(
    selectedLocation ? CAMPUS_LOCATIONS.find(l => l.name === selectedLocation) || null : null
  );
  const [filterType, setFilterType] = useState<'All' | 'Lost' | 'Found'>('All');

  // Filter items by type
  const displayedItems = items.filter(item => {
    if (filterType === 'All') return true;
    return item.type === filterType;
  });

  const handleBuildingClick = (building: CampusLocation) => {
    setSelectedBuilding(building);
    if (onSelectLocation) {
      onSelectLocation(building.name, { x: building.mapX, y: building.mapY });
    }
  };

  const handleMapSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerMode || !onSelectLocation) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    // Find nearest campus location within distance
    let nearestLoc = CAMPUS_LOCATIONS[0];
    let minDist = 9999;
    for (const loc of CAMPUS_LOCATIONS) {
      const dist = Math.sqrt(Math.pow(loc.mapX - x, 2) + Math.pow(loc.mapY - y, 2));
      if (dist < minDist) {
        minDist = dist;
        nearestLoc = loc;
      }
    }

    onSelectLocation(nearestLoc.name, { x, y });
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 shadow-md">
      {/* Top Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-700">
          <Compass className="w-4 h-4 text-indigo-600 animate-spin-slow" />
          <span>Interactive Campus Radar Map</span>
          {pickerMode && (
            <span className="bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full text-[11px]">
              Tap to set pin
            </span>
          )}
        </div>

        {!pickerMode && (
          <div className="flex items-center gap-1 pointer-events-auto bg-white/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 shadow-sm text-xs">
            <button
              onClick={() => setFilterType('All')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'All' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilterType('Lost')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'Lost' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Lost ({items.filter(i => i.type === 'Lost').length})
            </button>
            <button
              onClick={() => setFilterType('Found')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'Found' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Found ({items.filter(i => i.type === 'Found').length})
            </button>
          </div>
        )}
      </div>

      {/* Main Map Canvas */}
      <div
        onClick={handleMapSurfaceClick}
        className={`relative w-full ${heightClass} overflow-hidden cursor-crosshair select-none bg-[#eef3f6]`}
      >
        {/* Subtle Campus Grid & Zones */}
        <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="campus-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2,2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#campus-grid)" />
          {/* Main campus boulevard paths */}
          <path d="M 50,0 L 50,100" stroke="#94a3b8" strokeWidth="4" strokeDasharray="6,4" />
          <path d="M 0,50 L 100,50" stroke="#94a3b8" strokeWidth="4" strokeDasharray="6,4" />
          <circle cx="50%" cy="50%" r="22%" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4,4" />
        </svg>

        {/* Campus Buildings Visual Blocks */}
        {CAMPUS_LOCATIONS.map(loc => {
          const isSelected = selectedBuilding?.id === loc.id;
          const isHovered = hoveredBuilding?.id === loc.id;
          const locItems = displayedItems.filter(i => i.location === loc.name);

          return (
            <div
              key={loc.id}
              onClick={(e) => {
                e.stopPropagation();
                handleBuildingClick(loc);
              }}
              onMouseEnter={() => setHoveredBuilding(loc)}
              onMouseLeave={() => setHoveredBuilding(null)}
              style={{
                left: `${loc.mapX}%`,
                top: `${loc.mapY}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute cursor-pointer transition-all duration-300 z-10 ${
                isSelected ? 'scale-110 z-30' : isHovered ? 'scale-105 z-20' : 'hover:scale-105'
              }`}
            >
              <div
                className={`relative px-3 py-2 rounded-xl text-center shadow-md transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-200 shadow-lg'
                    : isHovered
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'bg-white/95 text-slate-800 border border-slate-300 backdrop-blur-xs'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xs font-bold whitespace-nowrap">{loc.name.split('/')[0]}</span>
                  {loc.hasHelpDesk && (
                    <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-md">
                      Help Desk
                    </span>
                  )}
                </div>

                <div className="text-[10px] opacity-75 font-mono">{loc.code}</div>

                {/* Items Badge at this Location */}
                {locItems.length > 0 && !pickerMode && (
                  <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1">
                    {locItems.some(i => i.type === 'Lost') && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs ring-2 ring-white">
                        {locItems.filter(i => i.type === 'Lost').length}
                      </span>
                    )}
                    {locItems.some(i => i.type === 'Found') && (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs ring-2 ring-white">
                        {locItems.filter(i => i.type === 'Found').length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Render Specific Item Map Pins */}
        {!pickerMode && displayedItems.map((item, idx) => {
          if (item.mapX === undefined || item.mapY === undefined) return null;
          const isLost = item.type === 'Lost';

          // Spiderfying: radial offset for pins sharing near-identical coordinates
          const sameCoordCount = displayedItems
            .slice(0, idx)
            .filter(prev => Math.abs((prev.mapX ?? 0) - (item.mapX ?? 0)) < 2.5 && Math.abs((prev.mapY ?? 0) - (item.mapY ?? 0)) < 2.5)
            .length;

          let displayX = item.mapX;
          let displayY = item.mapY;
          if (sameCoordCount > 0) {
            const angle = (sameCoordCount * 137.5) * (Math.PI / 180);
            const radius = 2.5 * Math.min(sameCoordCount, 3);
            displayX = Math.min(95, Math.max(5, item.mapX + Math.cos(angle) * radius));
            displayY = Math.min(92, Math.max(10, item.mapY + Math.sin(angle) * radius));
          }

          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                if (onItemClick) onItemClick(item);
              }}
              style={{
                left: `${displayX}%`,
                top: `${displayY}%`,
                transform: 'translate(-50%, -100%)',
              }}
              className="absolute z-20 cursor-pointer group"
            >
              <div
                className={`relative flex items-center justify-center w-7 h-7 rounded-full shadow-lg transition-transform group-hover:scale-125 ${
                  isLost ? 'bg-amber-600 text-white ring-2 ring-white' : 'bg-emerald-600 text-white ring-2 ring-white'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="absolute -bottom-1 w-1.5 h-1.5 bg-slate-900 rounded-full" />
              </div>

              {/* Pin Tooltip Card */}
              <div className="absolute bottom-9 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-40 pointer-events-none">
                <div className="bg-slate-900 text-white rounded-lg p-2.5 shadow-xl text-xs w-48 border border-slate-700">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        isLost ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                  </div>
                  <p className="font-semibold text-slate-100 truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-300 truncate">{item.location}</p>
                  <div className="mt-1 text-[10px] text-indigo-300 font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Click to view details
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Picker Mode Active Selection Pin */}
        {pickerMode && currentPin && (
          <div
            style={{
              left: `${currentPin.x}%`,
              top: `${currentPin.y}%`,
              transform: 'translate(-50%, -100%)',
            }}
            className="absolute z-30 pointer-events-none animate-bounce"
          >
            <div className="flex flex-col items-center">
              <div className="bg-indigo-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg mb-1 whitespace-nowrap">
                {currentPin.locationName || 'Selected Location'}
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl ring-4 ring-indigo-200">
                <MapPin className="w-5 h-5 fill-current" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Information */}
      <div className="bg-white px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="font-medium text-slate-700">Lost Items</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-700">Found Items</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600" />
            <span className="font-medium text-slate-700">Campus Help Desks</span>
          </div>
        </div>

        {selectedBuilding && (
          <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Selected: <span className="text-slate-900">{selectedBuilding.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};
