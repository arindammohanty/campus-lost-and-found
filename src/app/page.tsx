'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Item,
  User,
  CategoryType,
  CampusLocation,
  ItemType,
  ItemLifecycleStatus,
  PlatformNotification,
} from '../types/portal';
import {
  initializePortalStorage,
  getPortalItems,
  savePortalItem,
  updatePortalItemStatus,
  getActiveUser,
  setActiveUser,
  getPortalNotifications,
  markNotificationAsRead,
  getHandoverTickets,
  syncPortalItemsWithServer,
} from '../utils/portalStorage';
import { CATEGORIES, CAMPUS_LOCATIONS } from '../data/campusData';

// Components
import { Navbar } from '../components/Navbar';
import { ItemCard } from '../components/ItemCard';
import { CampusMap } from '../components/CampusMap';
import { SmartMatchPanel } from '../components/SmartMatchPanel';
import { ReportModal } from '../components/ReportModal';
import { ItemDetailsModal } from '../components/ItemDetailsModal';
import { SecureChatModal } from '../components/SecureChatModal';
import { HandoverModal } from '../components/HandoverModal';
import { NotificationsModal } from '../components/NotificationsModal';
import { AuthModal } from '../components/AuthModal';

// Icons
import {
  Search,
  Sparkles,
  MapPin,
  Filter,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  QrCode,
  ArrowRight,
  RefreshCw,
  Plus,
  HelpCircle,
  Package,
  Calendar,
  X,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  // 1. Initial State Initialization
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'explore' | 'map' | 'matches' | 'my-items' | 'helpdesk'>('explore');

  // 2. Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | 'Lost' | 'Found'>('All');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<ItemLifecycleStatus | 'All'>('All');
  const [viewLayout, setViewLayout] = useState<'grid' | 'map'>('grid');

  // 3. Modals State
  const [reportModalType, setReportModalType] = useState<ItemType | null>(null);
  const [activeItemForDetails, setActiveItemForDetails] = useState<Item | null>(null);
  const [activeItemForChat, setActiveItemForChat] = useState<Item | null>(null);
  const [activeItemForHandover, setActiveItemForHandover] = useState<Item | null>(null);
  const [focusedItemForMatch, setFocusedItemForMatch] = useState<Item | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');

  // 4. Toast Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const refreshAllData = (userOverride?: User | null) => {
    const userToUse = userOverride !== undefined ? userOverride : currentUser;
    setItems(getPortalItems());
    if (userToUse) {
      setNotifications(getPortalNotifications(userToUse.id));
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    initializePortalStorage();
    const active = getActiveUser();
    setCurrentUserState(active);
    refreshAllData(active);

    // Sync with live server database immediately so all users see reported lost and found items
    syncPortalItemsWithServer().then((syncedItems) => {
      if (syncedItems && syncedItems.length > 0) {
        setItems(syncedItems);
      }
    });

    // Periodic background sync every 15s to catch new items reported by any student
    const interval = setInterval(() => {
      syncPortalItemsWithServer().then((syncedItems) => {
        if (syncedItems && syncedItems.length > 0) {
          setItems(syncedItems);
        }
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleSwitchUser = (newUser: User) => {
    setActiveUser(newUser);
    setCurrentUserState(newUser);
    refreshAllData(newUser);
    showToast(`Switched active user to: ${newUser.name} (${newUser.role})`);
  };

  const handleSignOut = () => {
    setCurrentUserState(null);
    refreshAllData(null);
    showToast('Signed out of campus portal session.');
  };

  const handleOpenReportModal = (type: ItemType) => {
    if (!currentUser) {
      showToast('Please sign in or register with your University Registration Number to report an item.');
      setAuthModalTab('signup');
      setShowAuthModal(true);
      return;
    }
    setReportModalType(type);
  };

  const handleOpenChat = (item: Item) => {
    if (!currentUser) {
      showToast('Please sign in with your University Registration Number to access in-app chat.');
      setAuthModalTab('signin');
      setShowAuthModal(true);
      return;
    }
    setActiveItemForChat(item);
  };

  const handleOpenHandover = (item: Item) => {
    if (!currentUser) {
      showToast('Please sign in with your University Registration Number to generate or verify a handover pass.');
      setAuthModalTab('signin');
      setShowAuthModal(true);
      return;
    }
    setActiveItemForHandover(item);
  };

  // Report Submission Handler
  const handleReportSubmit = (formData: any) => {
    if (!currentUser) return;
    const result = savePortalItem(formData, currentUser);
    setReportModalType(null);
    refreshAllData();

    syncPortalItemsWithServer().then((syncedItems) => {
      if (syncedItems && syncedItems.length > 0) {
        setItems(syncedItems);
      }
    });

    if (result.matches.length > 0) {
      showToast(
        `🎉 Item registered! AI Match Radar detected ${result.matches.length} high-confidence match (${result.matches[0].score}% match score)!`
      );
      setFocusedItemForMatch(result.item);
      setActiveTab('matches');
    } else {
      showToast(`✅ ${formData.type} item submitted and active on Campus Radar!`);
    }
  };

  // Status Change Handler
  const handleItemStatusChange = (itemId: string, newStatus: ItemLifecycleStatus) => {
    const actor = currentUser ? currentUser.name : 'Campus Portal';
    updatePortalItemStatus(itemId, newStatus, `Updated by ${actor}`, actor);
    refreshAllData();
    if (activeItemForDetails && activeItemForDetails.id === itemId) {
      setActiveItemForDetails({ ...activeItemForDetails, status: newStatus });
    }
    showToast(`Updated item status to: ${newStatus}`);
  };

  // Deduplicated unique items failsafe
  const uniqueItems = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenContent = new Set<string>();
    const result: Item[] = [];
    for (const item of items) {
      if (!item || !item.id) continue;
      const key = `${(item.title || '').trim().toLowerCase()}|${(item.description || '').trim().toLowerCase()}|${item.date || ''}`;
      if (!seenIds.has(item.id) && !seenContent.has(key)) {
        seenIds.add(item.id);
        seenContent.add(key);
        result.push(item);
      }
    }
    return result;
  }, [items]);

  // Filtering Logic
  const filteredItems = uniqueItems.filter((item) => {
    // Type Filter
    if (selectedType !== 'All' && item.type !== selectedType) return false;

    // Category Filter
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;

    // Location Filter
    if (selectedLocation !== 'All' && item.location !== selectedLocation) return false;

    // Status Filter
    if (selectedStatus !== 'All' && item.status !== selectedStatus) return false;

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchLoc = item.location.toLowerCase().includes(q);
      const matchBrand = (item.brand || '').toLowerCase().includes(q);
      const matchColor = (item.color || '').toLowerCase().includes(q);
      const matchTags = (item.aiTags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchCat && !matchLoc && !matchBrand && !matchColor && !matchTags) {
        return false;
      }
    }

    return true;
  });

  // Calculate live statistics
  const totalLost = uniqueItems.filter((i) => i.type === 'Lost').length;
  const totalFound = uniqueItems.filter((i) => i.type === 'Found').length;
  const totalReturned = uniqueItems.filter((i) => i.status === 'Returned').length;
  const totalInHandover = uniqueItems.filter((i) => i.status === 'In Handover').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onSignOut={handleSignOut}
        notifications={notifications}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenReportModal={(type) => handleOpenReportModal(type)}
        onOpenAuthModal={() => {
          setAuthModalTab('signin');
          setShowAuthModal(true);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-semibold animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Banner with Live Campus Recovery Statistics */}
        <section className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-64 h-64" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-indigo-300 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Next-Gen Semantic Retrieval & Help Desk Protocol</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Campus Lost &amp; Found Portal
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Report lost possessions or discovered items across campus. Our in-browser multimodal AI
              matches photos and descriptions in real time, coordinating safe returns at campus help desks.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-5">
              <button
                onClick={() => handleOpenReportModal('Lost')}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                I Lost An Item
              </button>

              <button
                onClick={() => handleOpenReportModal('Found')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                I Found An Item
              </button>

              <button
                onClick={() => setActiveTab('map')}
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-3 rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4 text-indigo-300" />
                View Campus Map
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => {
                setSelectedType('Lost');
                setActiveTab('explore');
              }}
              className={`text-left bg-white/5 hover:bg-white/10 p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedType === 'Lost' && activeTab === 'explore' ? 'border-amber-400 bg-white/10 ring-1 ring-amber-400/50' : 'border-white/10'
              }`}
            >
              <span className="text-[11px] text-slate-400 font-semibold uppercase block">Lost Items</span>
              <span className="text-2xl font-black text-amber-400">{totalLost}</span>
            </button>
            <button
              onClick={() => {
                setSelectedType('Found');
                setActiveTab('explore');
              }}
              className={`text-left bg-white/5 hover:bg-white/10 p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedType === 'Found' && activeTab === 'explore' ? 'border-emerald-400 bg-white/10 ring-1 ring-emerald-400/50' : 'border-white/10'
              }`}
            >
              <span className="text-[11px] text-slate-400 font-semibold uppercase block">Found Items</span>
              <span className="text-2xl font-black text-emerald-400">{totalFound}</span>
            </button>
            <button
              onClick={() => {
                setSelectedStatus('In Handover');
                setActiveTab('explore');
              }}
              className={`text-left bg-white/5 hover:bg-white/10 p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedStatus === 'In Handover' && activeTab === 'explore' ? 'border-indigo-400 bg-white/10 ring-1 ring-indigo-400/50' : 'border-white/10'
              }`}
            >
              <span className="text-[11px] text-slate-400 font-semibold uppercase block">At Help Desk</span>
              <span className="text-2xl font-black text-indigo-400">{totalInHandover}</span>
            </button>
            <button
              onClick={() => {
                setSelectedStatus('Returned');
                setActiveTab('explore');
              }}
              className={`text-left bg-white/5 hover:bg-white/10 p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedStatus === 'Returned' && activeTab === 'explore' ? 'border-white bg-white/10 ring-1 ring-white/50' : 'border-white/10'
              }`}
            >
              <span className="text-[11px] text-slate-400 font-semibold uppercase block">Returned &amp; Closed</span>
              <span className="text-2xl font-black text-white">{totalReturned}</span>
            </button>
          </div>
        </section>

        {/* TAB 1: Explore & Search View */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            {/* Filter Pills & View Toggles */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              {/* Mobile Search Input (< md) */}
              <div className="md:hidden relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search lost & found items, categories, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-xl text-xs border border-transparent focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Type Filter Pills */}
                <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                  {(['All', 'Lost', 'Found'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedType(t)}
                      className={`px-4 py-2 rounded-xl transition-all ${
                        selectedType === t
                          ? t === 'Lost'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : t === 'Found'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t === 'All' ? 'All Items' : t === 'Lost' ? '🔍 Lost' : '📦 Found'}
                    </button>
                  ))}
                </div>

                {/* Grid vs Map View Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setViewLayout('grid')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      viewLayout === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Grid View
                  </button>
                  <button
                    onClick={() => setViewLayout('map')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      viewLayout === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Map Pins
                  </button>
                </div>
              </div>

              {/* Category Pills Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                    selectedCategory === 'All'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  All Categories
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                      selectedCategory === cat.name
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Location & Status Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="All">All Campus Locations</option>
                    {CAMPUS_LOCATIONS.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name} ({loc.zone} Zone)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="All">All Lifecycle Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="Under Review">Under Review (AI Processing)</option>
                    <option value="Active">Active (On Radar)</option>
                    <option value="Match Found">Match Found</option>
                    <option value="In Handover">In Handover (At Help Desk)</option>
                    <option value="Returned">Returned (Closed)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* View Presentation: Map or Grid */}
            {viewLayout === 'map' ? (
              <CampusMap
                items={filteredItems}
                onItemClick={(item) => setActiveItemForDetails(item)}
                heightClass="h-[580px]"
              />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Showing {filteredItems.length} active listings
                  </span>
                  {(selectedCategory !== 'All' ||
                    selectedLocation !== 'All' ||
                    selectedType !== 'All' ||
                    selectedStatus !== 'All' ||
                    searchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedType('All');
                        setSelectedCategory('All');
                        setSelectedLocation('All');
                        setSelectedStatus('All');
                        setSearchQuery('');
                      }}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>

                {filteredItems.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-base text-slate-800">No items match your filter criteria</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Try clearing the category or location filters, or submit a new report.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        currentUser={currentUser}
                        onOpenDetails={(i) => setActiveItemForDetails(i)}
                        onOpenChat={(i) => setActiveItemForChat(i)}
                        onOpenHandover={(i) => setActiveItemForHandover(i)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Campus Map View */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Interactive Campus Map Pinboard</h3>
                <p className="text-xs text-slate-500">
                  Select buildings to view registered lost and found items or locate nearby Help Desks.
                </p>
              </div>

              <button
                onClick={() => handleOpenReportModal('Lost')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Drop a Pin (Report Item)
              </button>
            </div>

            <CampusMap
              items={items}
              onItemClick={(item) => setActiveItemForDetails(item)}
              heightClass="h-[620px]"
            />
          </div>
        )}

        {/* TAB 3: AI Match Radar */}
        {activeTab === 'matches' && (
          <SmartMatchPanel
            items={items}
            currentUser={currentUser}
            onOpenItem={(item) => setActiveItemForDetails(item)}
            onOpenChat={(item) => handleOpenChat(item)}
            onOpenHandover={(item) => handleOpenHandover(item)}
            focusedItem={focusedItemForMatch}
            onClearFocus={() => setFocusedItemForMatch(null)}
          />
        )}

        {/* TAB 4: My Items & Activity */}
        {activeTab === 'my-items' && (
          !currentUser ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center max-w-md mx-auto my-8 space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-xl text-slate-900">Sign In Required</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Please sign in with your University Registration Number to view your personal reports, active matches, and handover passes.
              </p>
              <button
                onClick={() => {
                  setAuthModalTab('signin');
                  setShowAuthModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <span>Sign In / Register</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                    Student Dashboard
                  </span>
                  <h3 className="font-bold text-2xl text-slate-900">{currentUser.name}&apos;s Activity</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Roll No: <span className="font-mono text-slate-700">{currentUser.rollNumber}</span> • {currentUser.branch}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenReportModal('Lost')}
                    className="bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs"
                  >
                    + Report Lost Item
                  </button>
                  <button
                    onClick={() => handleOpenReportModal('Found')}
                    className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs"
                  >
                    + Report Found Item
                  </button>
                </div>
              </div>

              {/* My Lost Items */}
              <div>
                <h4 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  My Lost Item Reports ({items.filter((i) => i.userId === currentUser.id && i.type === 'Lost').length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items
                    .filter((i) => i.userId === currentUser.id && i.type === 'Lost')
                    .map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        currentUser={currentUser}
                        onOpenDetails={(i) => setActiveItemForDetails(i)}
                        onOpenChat={(i) => handleOpenChat(i)}
                        onOpenHandover={(i) => handleOpenHandover(i)}
                      />
                    ))}
                </div>
              </div>

              {/* My Found Reports */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  My Found Submissions ({items.filter((i) => i.userId === currentUser.id && i.type === 'Found').length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items
                    .filter((i) => i.userId === currentUser.id && i.type === 'Found')
                    .map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        currentUser={currentUser}
                        onOpenDetails={(i) => setActiveItemForDetails(i)}
                        onOpenChat={(i) => handleOpenChat(i)}
                        onOpenHandover={(i) => handleOpenHandover(i)}
                      />
                    ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 5: Campus Help Desk Handover View */}
        {activeTab === 'helpdesk' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1 w-fit mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Official Campus Facilities
                </span>
                <h3 className="font-black text-2xl text-white">Campus Help Desk Handover Operations</h3>
                <p className="text-xs text-slate-300 max-w-xl mt-1">
                  Physical exchange verification point. Students can show their 6-digit Handover PIN or
                  QR Code at designated Help Desks for safe item collection.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">
                  Logged in as:
                </span>
                <span className="text-sm font-bold text-amber-400">
                  {currentUser ? `${currentUser.name} (${currentUser.role === 'helpdesk_admin' ? 'Officer' : 'Student'})` : 'Guest / Visitor'}
                </span>
              </div>
            </div>

            {/* Items currently in handover */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h4 className="font-bold text-base text-slate-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Items Awaiting Verification at Help Desk Counters
              </h4>

              {items.filter((i) => i.status === 'In Handover').length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">All Handover Tickets Cleared</p>
                  <p className="text-[11px] text-slate-500">No items currently queued at Help Desk counters.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items
                    .filter((i) => i.status === 'In Handover')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                          />
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase">
                              {item.category} • {item.location}
                            </span>
                            <h5 className="font-bold text-sm text-slate-900">{item.title}</h5>
                            <p className="text-xs text-slate-500">
                              Claimant/Finder: {item.userName} ({item.userRoll})
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">
                              Handover PIN
                            </span>
                            {currentUser && (currentUser.role === 'helpdesk_admin' || currentUser.id === item.userId) ? (
                              <span className="text-base font-black font-mono tracking-widest text-indigo-700">
                                {item.handoverCode || '482910'}
                              </span>
                            ) : (
                              <span className="text-base font-black font-mono tracking-widest text-slate-400">
                                ••••••
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleOpenHandover(item)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1"
                          >
                            <QrCode className="w-4 h-4" />
                            {currentUser?.role === 'helpdesk_admin'
                              ? 'Open Desk Verifier'
                              : currentUser?.id === item.userId
                              ? 'View My Pass'
                              : 'Claim Item'}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Live Data Reload */}
            <div className="text-center pt-6">
              <button
                onClick={() => {
                  refreshAllData();
                  showToast('Portal feed reloaded.');
                }}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 inline-flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Live Feed
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: Report Lost / Found Item Wizard */}
      {reportModalType && currentUser && (
        <ReportModal
          initialType={reportModalType}
          currentUser={currentUser}
          onClose={() => setReportModalType(null)}
          onSubmit={handleReportSubmit}
        />
      )}

      {/* MODAL 2: Item Details & Lifecycle Modal */}
      {activeItemForDetails && (
        <ItemDetailsModal
          item={activeItemForDetails}
          currentUser={currentUser}
          onClose={() => setActiveItemForDetails(null)}
          onOpenChat={(i) => {
            setActiveItemForDetails(null);
            handleOpenChat(i);
          }}
          onOpenHandover={(i) => {
            setActiveItemForDetails(null);
            handleOpenHandover(i);
          }}
          onOpenMatchRadar={(i) => {
            setActiveItemForDetails(null);
            setFocusedItemForMatch(i);
            setActiveTab('matches');
          }}
          onStatusChange={handleItemStatusChange}
        />
      )}

      {/* MODAL 3: In-App Secure Chat Modal */}
      {activeItemForChat && currentUser && (
        <SecureChatModal
          item={activeItemForChat}
          currentUser={currentUser}
          onClose={() => setActiveItemForChat(null)}
          onOpenHandover={(i) => {
            setActiveItemForChat(null);
            handleOpenHandover(i);
          }}
        />
      )}

      {/* MODAL 4: Campus Help Desk Handover Modal */}
      {activeItemForHandover && currentUser && (
        <HandoverModal
          item={activeItemForHandover}
          currentUser={currentUser}
          onClose={() => setActiveItemForHandover(null)}
          onSuccess={() => {
            refreshAllData();
            showToast('Handover updated successfully!');
          }}
        />
      )}

      {/* MODAL 5: Notification Center Modal */}
      {showNotificationsModal && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setShowNotificationsModal(false)}
          onItemClick={(itemId) => {
            setShowNotificationsModal(false);
            const target = items.find((i) => i.id === itemId);
            if (target) setActiveItemForDetails(target);
          }}
          onMarkAllRead={() => {
            notifications.forEach((n) => markNotificationAsRead(n.id));
            refreshAllData();
          }}
        />
      )}

      {/* MODAL 6: University Portal Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        initialTab={authModalTab}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUserState(user);
          refreshAllData(user);
          showToast(`Welcome back, ${user.name}!`);
        }}
      />
    </div>
  );
}
