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
  HandoverTicket,
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
  isItemOwnedByUser,
  isItemArchived,
  getItemAgeInDays,
  createNotification,
  acceptClaimRequest,
  rejectClaimRequest,
  verifyHandoverAtDesk,
  findPairedItems,
  ADMIN_CREDENTIALS,
  ADMIN_USER,
  signOutPortalUser,
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
  PackageSearch,
  UserCheck,
  Archive,
  Lock,
  AlertCircle,
  ShieldAlert,
  Building,
  Link2,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();

  // 1. Initial State Initialization
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'explore' | 'map' | 'matches' | 'my-items' | 'helpdesk' | 'archive'>('explore');

  // 2. Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'All' | 'Lost' | 'Found'>('All');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'All'>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<ItemLifecycleStatus | 'All'>('All');
  const [viewLayout, setViewLayout] = useState<'grid' | 'map'>('grid');

  // 3. Modals State
  const [reportModalType, setReportModalType] = useState<ItemType | null>(null);
  const [reportModalInitialData, setReportModalInitialData] = useState<Partial<Item> | undefined>(undefined);
  const [matchedArchivedItem, setMatchedArchivedItem] = useState<Item | null>(null);
  const [archiveTypeFilter, setArchiveTypeFilter] = useState<'All' | 'Lost' | 'Found'>('All');
  const [activeItemForDetails, setActiveItemForDetails] = useState<Item | null>(null);
  const [activeItemForChat, setActiveItemForChat] = useState<Item | null>(null);
  const [activeItemForHandover, setActiveItemForHandover] = useState<Item | null>(null);
  const [focusedItemForMatch, setFocusedItemForMatch] = useState<Item | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');

  // 4. Handover & Collection Tickets State
  const [tickets, setTickets] = useState<HandoverTicket[]>([]);
  const [claimStatusFilter, setClaimStatusFilter] = useState<'All' | 'Pending Verification' | 'Completed' | 'Rejected'>('All');
  const [counterPinInput, setCounterPinInput] = useState('');
  const [counterVerifyMessage, setCounterVerifyMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // 5. Toast Message
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
    setTickets(getHandoverTickets());
    if (userToUse) {
      setNotifications(getPortalNotifications(userToUse.id));
    } else {
      setNotifications([]);
    }
  };

  const handleAdminQuickLogin = () => {
    setActiveUser(ADMIN_USER);
    setCurrentUserState(ADMIN_USER);
    refreshAllData(ADMIN_USER);
    showToast(`Signed in as Campus Desk Administrator (${ADMIN_USER.name})!`);
  };

  const handleAcceptClaim = (ticketId: string) => {
    const officerName = currentUser?.name || 'Arindam Mohanty';
    const res = acceptClaimRequest(ticketId, officerName);
    showToast(res.message);
    refreshAllData();
    syncPortalItemsWithServer().then((synced) => {
      if (synced && synced.length > 0) setItems(synced);
    });
  };

  const handleRejectClaim = (ticketId: string) => {
    const officerName = currentUser?.name || 'Arindam Mohanty';
    const res = rejectClaimRequest(ticketId, officerName);
    showToast(res.message);
    refreshAllData();
  };

  const handleCounterVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!counterPinInput.trim()) return;
    const officerName = currentUser?.name || 'Arindam Mohanty';
    const res = verifyHandoverAtDesk(counterPinInput.trim(), counterPinInput.trim(), officerName);
    if (res.success) {
      setCounterVerifyMessage({ text: res.message, type: 'success' });
      showToast(res.message);
      setCounterPinInput('');
      refreshAllData();
      syncPortalItemsWithServer().then((synced) => {
        if (synced && synced.length > 0) setItems(synced);
      });
    } else {
      setCounterVerifyMessage({ text: res.message, type: 'error' });
    }
    setTimeout(() => setCounterVerifyMessage(null), 4000);
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
    setReportModalInitialData(undefined);
    setMatchedArchivedItem(null);
    setReportModalType(type);
  };

  const handleReportFoundForArchivedItem = (archivedItem: Item) => {
    if (!currentUser) {
      showToast('Please sign in or register with your University Registration Number to report finding this item.');
      setAuthModalTab('signin');
      setShowAuthModal(true);
      return;
    }
    setMatchedArchivedItem(archivedItem);
    setReportModalInitialData({
      title: archivedItem.title.toLowerCase().startsWith('found') ? archivedItem.title : `Found: ${archivedItem.title}`,
      category: archivedItem.category,
      color: archivedItem.color,
      brand: archivedItem.brand,
      location: archivedItem.location,
      locationDetails: archivedItem.locationDetails,
      description: `Discovered item matching archived lost report #${archivedItem.id} ("${archivedItem.title}").`,
    });
    setReportModalType('Found');
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

    // If this found report was submitted for an archived lost item, pair them immediately!
    if (matchedArchivedItem) {
      updatePortalItemStatus(
        matchedArchivedItem.id,
        'Match Found',
        `Found report submitted by ${currentUser.name} (${currentUser.rollNumber})`,
        currentUser.name
      );
      createNotification({
        userId: matchedArchivedItem.userId,
        title: `Match Reported for Archived Listing!`,
        message: `${currentUser.name} reported finding an item matching your archived lost report "${matchedArchivedItem.title}". Check In-App Chat or AI Match Radar!`,
        type: 'match',
        itemId: matchedArchivedItem.id,
      });
      setMatchedArchivedItem(null);
      setReportModalInitialData(undefined);
    }

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
    const target = items.find((i) => i.id === itemId);
    const paired = target ? findPairedItems(target, items) : [];

    updatePortalItemStatus(itemId, newStatus, `Updated by ${actor}`, actor);
    refreshAllData();
    if (activeItemForDetails && activeItemForDetails.id === itemId) {
      setActiveItemForDetails({ ...activeItemForDetails, status: newStatus });
    }

    if (newStatus === 'Returned' && paired.length > 0) {
      showToast(`Updated item and synchronized paired item "${paired[0].title}" to Returned!`);
    } else {
      showToast(`Updated item status to: ${newStatus}`);
    }
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

    // Status & Archival Segregation
    if (selectedStatus === 'Archived') {
      if (!isItemArchived(item)) return false;
    } else if (selectedStatus !== 'All') {
      if (item.status !== selectedStatus) return false;
    } else {
      // By default in 'explore' view: active radar listings only
      // Found items that completed lifecycle (Returned) or lost/found items older than 60 days
      // automatically transition to the Archive Section
      if (isItemArchived(item)) return false;
    }

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
  const totalLost = uniqueItems.filter((i) => i.type === 'Lost' && !isItemArchived(i)).length;
  const totalFound = uniqueItems.filter((i) => i.type === 'Found' && !isItemArchived(i)).length;
  const totalReturned = uniqueItems.filter((i) => i.status === 'Returned').length;
  const totalInHandover = uniqueItems.filter((i) => i.status === 'In Handover').length;
  const totalArchived = uniqueItems.filter(isItemArchived).length;

  // Filtered archived listings for Archive Section
  const archivedListings = uniqueItems.filter((item) => {
    if (!isItemArchived(item)) return false;
    if (archiveTypeFilter !== 'All' && item.type !== archiveTypeFilter) return false;
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 pt-6 border-t border-white/10">
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
            <button
              onClick={() => {
                setActiveTab('archive');
              }}
              className={`text-left bg-white/5 hover:bg-white/10 p-3 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'archive' ? 'border-amber-400 bg-white/10 ring-1 ring-amber-400/50' : 'border-white/10'
              }`}
            >
              <span className="text-[11px] text-slate-400 font-semibold uppercase block flex items-center gap-1">
                <Archive className="w-3 h-3 text-amber-400" /> Archive (60d+)
              </span>
              <span className="text-2xl font-black text-amber-300">{totalArchived}</span>
            </button>
          </div>
        </section>

        {/* TAB 1: Explore & Search View */}
        {activeTab === 'explore' && (
          <div className="space-y-6">
            {/* Archive Notification Callout Banner */}
            {totalArchived > 0 && selectedStatus !== 'Archived' && (
              <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-2.5 text-amber-950">
                  <Archive className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Showing active campus radar. <strong>{totalArchived} listing(s)</strong> older than 60 days or completed have automatically transitioned to the Archive Section.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('archive')}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 text-[11px]"
                >
                  <span>Explore Archive (60+ Days)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
                    <option value="All">All Active Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="Under Review">Under Review (AI Processing)</option>
                    <option value="Active">Active (On Radar)</option>
                    <option value="Match Found">Match Found</option>
                    <option value="In Handover">In Handover (At Help Desk)</option>
                    <option value="Returned">Returned (Closed)</option>
                    <option value="Archived">Archived (60+ Days / Resolved)</option>
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
                        onOpenChat={(i) => handleOpenChat(i)}
                        onOpenHandover={(i) => handleOpenHandover(i)}
                        onReportFound={(i) => handleReportFoundForArchivedItem(i)}
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
            (() => {
              const myLostItems = items.filter((i) => isItemOwnedByUser(i, currentUser) && i.type === 'Lost');
              const myFoundItems = items.filter((i) => isItemOwnedByUser(i, currentUser) && i.type === 'Found');
              const myAllItems = [...myLostItems, ...myFoundItems];
              const myMatchCount = myAllItems.filter((i) => i.status === 'Match Found').length;
              const myHandoverCount = myAllItems.filter((i) => i.status === 'In Handover').length;
              const myReturnedCount = myAllItems.filter((i) => i.status === 'Returned').length;

              return (
                <div className="space-y-6">
                  {/* User Profile & Quick Actions */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-indigo-600" />
                          Verified Campus Identity
                        </span>
                        {currentUser.role === 'helpdesk_admin' && (
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            Help Desk Officer
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-2xl text-slate-900">{currentUser.name}&apos;s Activity Hub</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Registration No: <span className="font-mono font-bold text-slate-800">{currentUser.rollNumber}</span> • {currentUser.branch}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReportModal('Lost')}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Report Lost Item</span>
                      </button>
                      <button
                        onClick={() => handleOpenReportModal('Found')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Report Found Item</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Tracked Listings
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">{myAllItems.length}</span>
                        <span className="text-[11px] text-slate-500 font-medium">({myLostItems.length} Lost / {myFoundItems.length} Found)</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block mb-1 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Matches
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-purple-700">{myMatchCount}</span>
                        <span className="text-[11px] text-slate-500 font-medium">Candidates</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        In Handover
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-indigo-700">{myHandoverCount}</span>
                        <span className="text-[11px] text-slate-500 font-medium">At Help Desk</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Reunited
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-emerald-700">{myReturnedCount}</span>
                        <span className="text-[11px] text-slate-500 font-medium">Resolved</span>
                      </div>
                    </div>
                  </div>

                  {/* My Lost Items */}
                  <div>
                    <h4 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500" />
                      My Lost Item Reports ({myLostItems.length})
                    </h4>
                    {myLostItems.length === 0 ? (
                      <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-8 text-center max-w-lg mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                          <PackageSearch className="w-6 h-6" />
                        </div>
                        <h5 className="font-bold text-sm text-slate-800 mb-1">No Lost Items Reported</h5>
                        <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
                          Misplaced something on campus? Register a lost item report to activate real-time AI scanning and campus alerts.
                        </p>
                        <button
                          onClick={() => handleOpenReportModal('Lost')}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Report Lost Item</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myLostItems.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            currentUser={currentUser}
                            onOpenDetails={(i) => setActiveItemForDetails(i)}
                            onOpenChat={(i) => handleOpenChat(i)}
                            onOpenHandover={(i) => handleOpenHandover(i)}
                            onReportFound={(i) => handleReportFoundForArchivedItem(i)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* My Found Reports */}
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="font-bold text-base text-slate-900 mb-3 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" />
                      My Found Submissions ({myFoundItems.length})
                    </h4>
                    {myFoundItems.length === 0 ? (
                      <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-8 text-center max-w-lg mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h5 className="font-bold text-sm text-slate-800 mb-1">No Found Submissions Yet</h5>
                        <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
                          Found an unattended item around classrooms or the library? Log it here to help reunite it with its rightful owner.
                        </p>
                        <button
                          onClick={() => handleOpenReportModal('Found')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Report Found Item</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myFoundItems.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            currentUser={currentUser}
                            onOpenDetails={(i) => setActiveItemForDetails(i)}
                            onOpenChat={(i) => handleOpenChat(i)}
                            onOpenHandover={(i) => handleOpenHandover(i)}
                            onReportFound={(i) => handleReportFoundForArchivedItem(i)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )
        )}

        {/* TAB 5: Campus Help Desk Handover & Collection Claims Management View */}
        {activeTab === 'helpdesk' && (
          <div className="space-y-6">
            {/* Gating Check 1: User is NOT Signed In */}
            {!currentUser ? (
              <div className="space-y-6">
                {/* Locked Officer Gate Screen */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl border border-indigo-500/20 text-center max-w-3xl mx-auto">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-400/30 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Lock className="w-10 h-10" />
                  </div>

                  <span className="bg-amber-400/10 text-amber-300 font-bold text-xs uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-amber-400/30 inline-flex items-center gap-1.5 mb-3">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Restricted Campus Desk Area
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Campus Collection Desk Authentication Required
                  </h3>

                  <p className="text-slate-300 text-sm mt-3 leading-relaxed max-w-xl mx-auto">
                    To protect student privacy, confidential ownership proofs, and physical collection handover codes, this console is strictly restricted to authorized Campus Collection Desk Officers and registered student claimants.
                  </p>

                  {/* Two Clear Call-to-Action Buttons */}
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <button
                      onClick={handleAdminQuickLogin}
                      className="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black text-sm px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-400/20 flex items-center gap-2"
                    >
                      <ShieldCheck className="w-5 h-5 text-slate-950" />
                      <span>Sign In as Collection Desk Officer</span>
                    </button>

                    <button
                      onClick={() => {
                        setAuthModalTab('signin');
                        setShowAuthModal(true);
                      }}
                      className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-sm px-6 py-3.5 rounded-2xl border border-white/20 transition-all flex items-center gap-2"
                    >
                      <UserCheck className="w-5 h-5 text-indigo-300" />
                      <span>Student Sign In (View My Passes)</span>
                    </button>
                  </div>

                  {/* Campus Help Desk Operational Information */}
                  <div className="mt-10 pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <Building className="w-5 h-5 text-indigo-400 mb-2" />
                      <h5 className="font-bold text-xs text-white">Central Library Desk</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Ground Floor Circulation Counter • 09:00 AM – 06:00 PM</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <Building className="w-5 h-5 text-indigo-400 mb-2" />
                      <h5 className="font-bold text-xs text-white">Student Center Desk</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Cafeteria Foyer Operations • 08:30 AM – 08:00 PM</p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                      <Building className="w-5 h-5 text-indigo-400 mb-2" />
                      <h5 className="font-bold text-xs text-white">Security HQ Desk</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Admin Building Room 102 • 24/7 Campus Security</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : currentUser.role !== 'helpdesk_admin' && currentUser.email !== ADMIN_CREDENTIALS.email ? (
              /* Gating Check 2: Regular Student Logged In */
              <div className="space-y-6">
                {/* Student Personal Passes Header */}
                <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
                  <div className="max-w-2xl">
                    <span className="bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5 w-fit mb-3">
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      Student Portal • My Collection Passes
                    </span>
                    <h3 className="font-black text-2xl sm:text-3xl text-white tracking-tight">
                      My Campus Collection Passes &amp; Claims
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                      Track the status of your item collection requests. Present your 6-digit Handover PIN or QR pass at the assigned Help Desk counter with your Student ID card to claim your property.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          Student: {currentUser.name} (Reg No: <code className="font-mono text-amber-300">{currentUser.rollNumber}</code>)
                        </span>
                      </div>
                      <button
                        onClick={handleAdminQuickLogin}
                        className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Switch to Officer Mode
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-right backdrop-blur-xs min-w-[200px]">
                    <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">
                      Student Session
                    </span>
                    <span className="text-base font-bold text-white block mt-0.5">{currentUser.name}</span>
                    <span className="text-xs font-mono text-indigo-300 block">{currentUser.email}</span>
                    <button
                      onClick={handleSignOut}
                      className="text-[11px] font-bold text-rose-300 hover:text-rose-200 underline mt-2 block ml-auto transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* Student's Own Claim Tickets */}
                {(() => {
                  const myTickets = tickets.filter(
                    (t) =>
                      t.claimantId === currentUser.id ||
                      (t.claimantRoll && currentUser.rollNumber && t.claimantRoll.trim().toLowerCase() === currentUser.rollNumber.trim().toLowerCase()) ||
                      (t.claimantEmail && currentUser.email && t.claimantEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase())
                  );

                  if (myTickets.length === 0) {
                    return (
                      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-xs">
                        <PackageSearch className="w-12 h-12 text-indigo-400 mx-auto mb-3 opacity-80" />
                        <h4 className="font-bold text-base text-slate-900">No Active Collection Passes</h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                          You haven't requested any campus collection passes yet. If you spot your lost item in the Found listings, open the item and click &quot;Request Collection Pass&quot; or chat with the finder to initiate a safe help desk handover.
                        </p>
                        <button
                          onClick={() => setActiveTab('explore')}
                          className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md"
                        >
                          Browse Active Listings
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-indigo-600" />
                        My Active Collection Passes ({myTickets.length})
                      </h4>

                      <div className="grid grid-cols-1 gap-4">
                        {myTickets.map((ticket) => {
                          const associatedItem = items.find((i) => i.id === ticket.itemId);
                          const isPending = ticket.status === 'Pending Verification';
                          const isCompleted = ticket.status === 'Completed';

                          return (
                            <div
                              key={ticket.id}
                              className={`rounded-2xl border p-5 ${
                                isPending
                                  ? 'bg-amber-50/30 border-amber-200'
                                  : isCompleted
                                  ? 'bg-emerald-50/20 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex items-start gap-4">
                                  {associatedItem?.imageUrl ? (
                                    <img
                                      src={associatedItem.imageUrl}
                                      alt={ticket.itemTitle}
                                      className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                      <Package className="w-7 h-7" />
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full uppercase">
                                        {ticket.itemType} Pass
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                          isPending
                                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                            : isCompleted
                                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                                        }`}
                                      >
                                        {ticket.status}
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-base text-slate-900 mt-1">{ticket.itemTitle}</h5>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                      🏢 Pickup Counter: <strong>{ticket.helpDeskLocation}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-center min-w-[140px]">
                                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">
                                    Your Handover PIN
                                  </span>
                                  <span className="text-2xl font-black font-mono tracking-widest text-indigo-900">
                                    {ticket.handoverCode}
                                  </span>
                                  <span className="text-[10px] text-indigo-500 block mt-0.5">Show this at counter</span>
                                </div>
                              </div>

                              {ticket.secretDetailProof && (
                                <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                    Your Submitted Ownership Proof:
                                  </span>
                                  <p className="text-xs text-slate-700 italic">&quot;{ticket.secretDetailProof}&quot;</p>
                                </div>
                              )}

                              {ticket.officerNotes && (
                                <p className="text-xs text-slate-600 mt-2 bg-slate-100 p-2.5 rounded-xl">
                                  📝 <strong>Officer Update:</strong> {ticket.officerNotes}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Items Owned by Current Student in Handover */}
                {(() => {
                  const myHandoverItems = items.filter(
                    (i) => i.status === 'In Handover' && isItemOwnedByUser(i, currentUser)
                  );
                  if (myHandoverItems.length === 0) return null;

                  return (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
                      <h4 className="font-bold text-base text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        My Items Awaiting Verification at Help Desk Counters
                      </h4>

                      <div className="space-y-3">
                        {myHandoverItems.map((item) => (
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
                                <p className="text-xs text-slate-500">Status: {item.status}</p>
                              </div>
                            </div>

                            <button
                              onClick={() => handleOpenHandover(item)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1"
                            >
                              <QrCode className="w-4 h-4" />
                              View My Pass
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Gating Check 3: Authorized Campus Desk Officer / Admin */
              <div className="space-y-6">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
                  <div className="max-w-2xl">
                    <span className="bg-indigo-500/20 text-indigo-300 font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-500/30 flex items-center gap-1.5 w-fit mb-3">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      Official Campus Operations
                    </span>
                    <h3 className="font-black text-2xl sm:text-3xl text-white tracking-tight">
                      Campus Collection Desks &amp; Claims Operations
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                      Authorized collection and verification center. Review and accept student claims for found items,
                      verify secret ownership details, and authorize safe physical collection at campus help desks.
                    </p>

                    {/* Admin Status Pill */}
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-300">
                          Admin Authorized: {currentUser.name} ({currentUser.email})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 text-right backdrop-blur-xs min-w-[220px]">
                    <span className="text-[11px] text-slate-400 block font-medium uppercase tracking-wider">
                      Active Officer Session
                    </span>
                    <span className="text-base font-bold text-white block mt-0.5">{currentUser.name}</span>
                    <span className="text-xs font-mono text-amber-400 block">
                      🛡️ Campus Collection Desk Officer
                    </span>
                    <button
                      onClick={() => {
                        signOutPortalUser();
                        setCurrentUserState(null);
                        refreshAllData(null);
                        showToast('Signed out of officer session.');
                      }}
                      className="text-[11px] font-bold text-slate-400 hover:text-rose-300 underline mt-2 block ml-auto transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>

                {/* SECTION 1: INCOMING COLLECTION REQUESTS & CLAIMS */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        <h4 className="font-bold text-lg text-slate-900">
                          Collection Requests &amp; Student Claims
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Students submit claims with secret ownership proof to collect items at designated desks.
                      </p>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                      {(['All', 'Pending Verification', 'Completed', 'Rejected'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setClaimStatusFilter(st)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                            claimStatusFilter === st
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {st === 'All' ? 'All Claims' : st}
                          {st === 'Pending Verification' && (
                            <span className="ml-1.5 bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                              {tickets.filter((t) => t.status === 'Pending Verification').length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tickets List */}
                  {(() => {
                    const filteredTickets = tickets.filter((t) =>
                      claimStatusFilter === 'All' ? true : t.status === claimStatusFilter
                    );

                    if (filteredTickets.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-400">
                          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                          <p className="text-sm font-bold text-slate-700">No collection requests found</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {claimStatusFilter === 'All'
                              ? 'No student claims currently filed for campus collection desks.'
                              : `No claims matching filter "${claimStatusFilter}".`}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 gap-4">
                        {filteredTickets.map((ticket) => {
                          const associatedItem = items.find((i) => i.id === ticket.itemId);
                          const pairedItems = associatedItem ? findPairedItems(associatedItem, items) : [];
                          const isPending = ticket.status === 'Pending Verification';
                          const isCompleted = ticket.status === 'Completed';
                          const isRejected = ticket.status === 'Rejected';

                          return (
                            <div
                              key={ticket.id}
                              className={`rounded-2xl border p-5 transition-all ${
                                isPending
                                  ? 'bg-amber-50/30 border-amber-200 ring-1 ring-amber-300/40'
                                  : isCompleted
                                  ? 'bg-emerald-50/20 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200 opacity-75'
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                {/* Left: Item & Claimant info */}
                                <div className="flex items-start gap-4 flex-1 min-w-[280px]">
                                  {associatedItem?.imageUrl ? (
                                    <img
                                      src={associatedItem.imageUrl}
                                      alt={ticket.itemTitle}
                                      className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                      <Package className="w-7 h-7" />
                                    </div>
                                  )}

                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full uppercase">
                                        {ticket.itemType} Claim
                                      </span>
                                      <span className="text-[11px] font-mono text-slate-400">
                                        Ticket #{ticket.id.slice(-8)}
                                      </span>
                                      <span
                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                          isPending
                                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                            : isCompleted
                                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                                        }`}
                                      >
                                        {ticket.status}
                                      </span>
                                    </div>

                                    <h5 className="font-bold text-base text-slate-900">
                                      {ticket.itemTitle}
                                    </h5>

                                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                                      <span>
                                        👤 Claimant: <strong className="text-slate-800">{ticket.claimantName}</strong>
                                      </span>
                                      <span>
                                        🎓 Reg No: <code className="font-mono font-bold text-indigo-700">{ticket.claimantRoll}</code>
                                      </span>
                                      <span>
                                        🏢 Collection Desk: <strong className="text-slate-800">{ticket.helpDeskLocation}</strong>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Security Handover PIN */}
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Handover PIN
                                  </span>
                                  <span className="text-lg font-black font-mono tracking-widest text-indigo-700">
                                    {ticket.handoverCode}
                                  </span>
                                </div>
                              </div>

                              {/* Paired Item Linkage Notice */}
                              {pairedItems.length > 0 && (
                                <div className="mt-3 bg-indigo-50/80 border border-indigo-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span className="text-xs text-indigo-950">
                                      <strong>Matched Paired Item:</strong> &quot;{pairedItems[0].title}&quot; ({pairedItems[0].type}) • Reporter: {pairedItems[0].userName} ({pairedItems[0].userRoll}) • Status: <span className="font-bold">{pairedItems[0].status}</span>
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold bg-indigo-200/70 text-indigo-900 px-2.5 py-0.5 rounded-full shrink-0">
                                    Auto-Reconciles on Approval
                                  </span>
                                </div>
                              )}

                              {/* Secret Detail Proof Box */}
                              <div className="mt-3.5 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                                  Claimant Confidential Proof of Ownership / Identifying Details:
                                </span>
                                <p className="text-xs font-semibold text-slate-800 bg-amber-50/60 p-2.5 rounded-lg border border-amber-200/60 italic">
                                  &quot;{ticket.secretDetailProof}&quot;
                                </p>
                                {ticket.officerNotes && (
                                  <p className="text-[11px] text-slate-500 mt-2">
                                    📝 <strong>Officer Notes:</strong> {ticket.officerNotes}
                                  </p>
                                )}
                              </div>

                              {/* Admin Action Buttons */}
                              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                                <span className="text-[11px] text-slate-400 font-medium">
                                  Filed on {new Date(ticket.createdAt).toLocaleDateString()} at {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Open Item Details Modal */}
                                  {associatedItem && (
                                    <button
                                      onClick={() => setActiveItemForDetails(associatedItem)}
                                      className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                                    >
                                      View Item
                                    </button>
                                  )}

                                  {/* Actions for Pending Verification */}
                                  {isPending && (
                                    <>
                                      <button
                                        onClick={() => handleRejectClaim(ticket.id)}
                                        className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
                                      >
                                        ✕ Reject Claim
                                      </button>

                                      <button
                                        onClick={() => handleAcceptClaim(ticket.id)}
                                        className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Accept Collection Request &amp; Release</span>
                                      </button>
                                    </>
                                  )}

                                  {isCompleted && (
                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Claim Accepted &amp; Item Released
                                    </span>
                                  )}

                                  {isRejected && (
                                    <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1.5 rounded-xl">
                                      Claim Rejected
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* SECTION 2: PHYSICAL COUNTER QUICK PIN VERIFIER */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
                  <div className="max-w-xl">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block mb-1">
                      Help Desk Counter Console
                    </span>
                    <h4 className="text-lg font-black text-white">Physical Handover PIN Verifier</h4>
                    <p className="text-xs text-slate-300 mt-1 mb-4 leading-relaxed">
                      When a student visits the physical collection desk, type their 6-digit Handover PIN or scan their pass QR code to verify and release custody instantly. Matching paired items will automatically synchronize to Returned.
                    </p>

                    <form onSubmit={handleCounterVerify} className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[200px]">
                        <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={counterPinInput}
                          onChange={(e) => setCounterPinInput(e.target.value)}
                          placeholder="Enter 6-digit PIN (e.g. 746430)"
                          maxLength={10}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        type="submit"
                        className="bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify &amp; Accept Collection</span>
                      </button>
                    </form>

                    {counterVerifyMessage && (
                      <div
                        className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
                          counterVerifyMessage.type === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{counterVerifyMessage.text}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: ITEMS CURRENTLY IN HANDOVER CUSTODY */}
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
                                <span className="text-base font-black font-mono tracking-widest text-indigo-700">
                                  {item.handoverCode || '482910'}
                                </span>
                              </div>

                              <button
                                onClick={() => handleOpenHandover(item)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1"
                              >
                                <QrCode className="w-4 h-4" />
                                Open Desk Verifier
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

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

        {/* TAB 6: Campus Archive Section (60+ Days & Resolved Listings) */}
        {activeTab === 'archive' && (
          <div className="space-y-6">
            {/* Archive Header Banner */}
            <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 rounded-3xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 w-fit mb-2">
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  Campus Historical Archive
                </span>
                <h3 className="font-black text-2xl text-white">Archived Lost &amp; Found Listings</h3>
                <p className="text-xs text-slate-300 max-w-xl mt-1 leading-relaxed">
                  Listings older than 60 days and resolved/returned items automatically transition here to keep the active campus radar focused.
                  All archived records remain permanently accessible. If you discover an archived lost item on campus, click <strong>&quot;Report Found&quot;</strong> to notify the student!
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">
                  Retention Policy:
                </span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  60-Day Auto Archive
                </span>
              </div>
            </div>

            {/* Metric Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Total in Archive
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {uniqueItems.filter(isItemArchived).length}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Listings</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1 flex items-center gap-1">
                  <PackageSearch className="w-3.5 h-3.5" />
                  Archived Lost
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-amber-700">
                    {uniqueItems.filter((i) => isItemArchived(i) && i.type === 'Lost').length}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">(60+ Days)</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Archived Found
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-700">
                    {uniqueItems.filter((i) => isItemArchived(i) && i.type === 'Found').length}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Records</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Reunited / Closed
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-700">
                    {uniqueItems.filter((i) => i.status === 'Returned').length}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Completed</span>
                </div>
              </div>
            </div>

            {/* Archive Type Filter Pills */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setArchiveTypeFilter('All')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    archiveTypeFilter === 'All'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Archive ({uniqueItems.filter(isItemArchived).length})
                </button>
                <button
                  onClick={() => setArchiveTypeFilter('Lost')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    archiveTypeFilter === 'Lost'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Lost (60+ Days) ({uniqueItems.filter((i) => isItemArchived(i) && i.type === 'Lost').length})
                </button>
                <button
                  onClick={() => setArchiveTypeFilter('Found')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    archiveTypeFilter === 'Found'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Found / Resolved ({uniqueItems.filter((i) => isItemArchived(i) && i.type === 'Found').length})
                </button>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Found an item listed here? Click <strong>Report Found</strong> on the card to notify the owner.</span>
              </div>
            </div>

            {/* Archive Listings Grid */}
            {archivedListings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                  <Archive className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-base text-slate-900 mb-1">No Items in This Archive View</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  No listings match the selected archive filter. You can switch between All, Lost (60+ Days), or Found items.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {archivedListings.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    currentUser={currentUser}
                    onOpenDetails={(i) => setActiveItemForDetails(i)}
                    onOpenChat={(i) => handleOpenChat(i)}
                    onOpenHandover={(i) => handleOpenHandover(i)}
                    onReportFound={(i) => handleReportFoundForArchivedItem(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Report Lost / Found Item Wizard */}
      {reportModalType && currentUser && (
        <ReportModal
          initialType={reportModalType}
          initialItemData={reportModalInitialData}
          matchedArchivedItem={matchedArchivedItem}
          currentUser={currentUser}
          onClose={() => {
            setReportModalType(null);
            setReportModalInitialData(undefined);
            setMatchedArchivedItem(null);
          }}
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
          onReportFound={(i) => {
            setActiveItemForDetails(null);
            handleReportFoundForArchivedItem(i);
          }}
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
