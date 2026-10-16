import { Item, User, HandoverTicket, ChatMessage, PlatformNotification, ItemLifecycleStatus } from '../types/portal';
import { INITIAL_ITEMS } from '../data/campusData';
import { extractAIFeatures, calculateMatchScore } from './aiEngine';

const STORAGE_KEYS = {
  ITEMS: 'campus_portal_items_v3',
  USERS: 'campus_portal_users_v3',
  CURRENT_USER: 'campus_portal_active_user_v3',
  TICKETS: 'campus_portal_tickets_v3',
  MESSAGES: 'campus_portal_messages_v3',
  NOTIFICATIONS: 'campus_portal_notifications_v3',
};

// Safe LocalStorage helpers
function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    console.error(`Error reading key ${key} from localStorage:`, e);
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing key ${key} to localStorage:`, e);
  }
}

/**
 * Initialize storage with clean production state if empty
 */
export function initializePortalStorage(): void {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(STORAGE_KEYS.ITEMS);
  if (!existing) {
    writeStorage(STORAGE_KEYS.ITEMS, []);
    writeStorage(STORAGE_KEYS.USERS, []);
    writeStorage(STORAGE_KEYS.TICKETS, []);
    writeStorage(STORAGE_KEYS.MESSAGES, []);
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, []);
  }
}

// Helper to deduplicate item arrays by ID and content signature
function deduplicateItems(items: Item[]): Item[] {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const result: Item[] = [];

  for (const item of items) {
    if (!item || !item.id) continue;
    const contentKey = `${(item.title || '').trim().toLowerCase()}|${(item.description || '').trim().toLowerCase()}|${item.date || ''}`;

    if (!seenIds.has(item.id) && !seenContent.has(contentKey)) {
      seenIds.add(item.id);
      seenContent.add(contentKey);
      result.push(item);
    }
  }

  return result;
}

export function getPortalItems(): Item[] {
  const raw = readStorage<Item[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
  const deduped = deduplicateItems(raw);
  if (deduped.length !== raw.length) {
    writeStorage(STORAGE_KEYS.ITEMS, deduped);
  }
  return deduped;
}

export async function syncPortalItemsWithServer(): Promise<Item[]> {
  if (typeof window === 'undefined') return [];
  try {
    const res = await fetch('/api/items');
    if (!res.ok) return getPortalItems();
    const data = await res.json();
    if (data.success && Array.isArray(data.items)) {
      const serverItems: Item[] = data.items;
      
      // Deduplicate server items and replace localStorage cache cleanly
      const deduped = deduplicateItems(serverItems);

      // Sort by creation date descending
      deduped.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date).getTime();
        const timeB = new Date(b.createdAt || b.date).getTime();
        return timeB - timeA;
      });

      writeStorage(STORAGE_KEYS.ITEMS, deduped);
      return deduped;
    }
  } catch (err) {
    console.error('Failed to sync items with server:', err);
  }
  return getPortalItems();
}

export function getPortalItemById(id: string): Item | undefined {
  const items = getPortalItems();
  return items.find((i) => i.id === id);
}

export function savePortalItem(
  itemData: Partial<Item>,
  user: User
): { item: Item; matches: Array<{ item: Item; score: number }> } {
  const items = getPortalItems();
  const id = `item-${Date.now()}`;
  const now = new Date().toISOString();

  // Extract AI features automatically
  const aiInfo = extractAIFeatures(itemData.title || '', itemData.description || '');

  // Generate 6-digit handover PIN
  const handoverCode = Math.floor(100000 + Math.random() * 900000).toString();

  const newItem: Item = {
    id,
    type: itemData.type || 'Lost',
    title: itemData.title?.trim() || 'Untitled Campus Item',
    category: itemData.category || aiInfo.category,
    brand: itemData.brand?.trim() || aiInfo.brand,
    color: itemData.color?.trim() || aiInfo.color,
    description: itemData.description?.trim() || '',
    location: itemData.location || 'Central Library & Reading Hall',
    locationDetails: itemData.locationDetails?.trim() || '',
    mapX: itemData.mapX !== undefined ? itemData.mapX : 50,
    mapY: itemData.mapY !== undefined ? itemData.mapY : 50,
    date: itemData.date || now.split('T')[0],
    time: itemData.time || '12:00 PM',
    contactPreference: itemData.contactPreference || 'In-App Chat',
    imageUrl: itemData.imageUrl || (itemData.type === 'Found' 
      ? 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&q=80&w=800' 
      : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800'),
    identifyingDetails: itemData.identifyingDetails?.trim() || '',
    status: 'Active',
    historyLog: [
      {
        status: 'Reported',
        timestamp: now,
        note: `${itemData.type} item report registered by ${user.name}`,
        actor: user.name,
      },
      {
        status: 'Under Review',
        timestamp: new Date(Date.now() + 500).toISOString(),
        note: `AI visual & semantic analysis complete (${aiInfo.tags.join(', ')})`,
        actor: 'AI Visual Engine',
      },
      {
        status: 'Active',
        timestamp: new Date(Date.now() + 1000).toISOString(),
        note: 'Published to active campus radar and map',
        actor: 'System',
      },
    ],
    aiTags: aiInfo.tags,
    aiConfidence: aiInfo.confidence,
    handoverCode,
    helpDeskLocation: `${itemData.location || 'Campus'} Help Desk`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userRoll: user.rollNumber,
    userPhone: user.phone,
    createdAt: now,
    updatedAt: now,
  };

  // Find immediate matches
  const targetOppositeType = newItem.type === 'Lost' ? 'Found' : 'Lost';
  const oppositeItems = items.filter(i => i.type === targetOppositeType && i.status !== 'Returned');
  const matchedList: Array<{ item: Item; score: number }> = [];

  for (const candidate of oppositeItems) {
    const lost = newItem.type === 'Lost' ? newItem : candidate;
    const found = newItem.type === 'Found' ? newItem : candidate;
    const { score } = calculateMatchScore(lost, found);

    if (score >= 40) {
      matchedList.push({ item: candidate, score });
      // Update candidate status to Match Found if it's currently Active
      if (candidate.status === 'Active') {
        candidate.status = 'Match Found';
        candidate.historyLog.push({
          status: 'Match Found',
          timestamp: now,
          note: `Potential match detected with "${newItem.title}" (${score}% score)`,
          actor: 'Auto-Matching Engine',
        });
      }
    }
  }

  if (matchedList.length > 0) {
    newItem.status = 'Match Found';
    newItem.historyLog.push({
      status: 'Match Found',
      timestamp: now,
      note: `Potential match detected with ${matchedList.length} item(s)`,
      actor: 'Auto-Matching Engine',
    });

    // Notify user
    createNotification({
      userId: user.id,
      title: `Potential Match Detected! (${matchedList[0].score}%)`,
      message: `Your item "${newItem.title}" matches "${matchedList[0].item.title}". Check your Match Radar!`,
      type: 'match',
      itemId: newItem.id,
    });
  }

  items.unshift(newItem);
  writeStorage(STORAGE_KEYS.ITEMS, items);

  // Send to server in background so all users see it across devices
  if (typeof window !== 'undefined') {
    fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newItem.id,
        type: newItem.type,
        title: newItem.title,
        category: newItem.category,
        brand: newItem.brand,
        color: newItem.color,
        description: newItem.description,
        location: newItem.location,
        locationDetails: newItem.locationDetails,
        mapX: newItem.mapX,
        mapY: newItem.mapY,
        date: newItem.date,
        time: newItem.time,
        contactPreference: newItem.contactPreference,
        imageUrl: newItem.imageUrl,
        identifyingDetails: newItem.identifyingDetails,
        currentCustody: newItem.currentCustody,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRoll: user.rollNumber,
      }),
    }).catch((err) => console.error('Failed to sync reported item to server:', err));
  }

  return { item: newItem, matches: matchedList };
}

/**
 * Finds all paired / matching items of the opposite type for a given item.
 * For example:
 * - A Found watch pairs with a Lost watch reported by the claimant.
 * - Items with high AI match score (>= 40).
 * - Items linked through an active or historical HandoverTicket where claimant matches owner.
 * - Items with matching category and title keywords.
 */
export function findPairedItems(targetItem: Item, allItems?: Item[]): Item[] {
  if (!targetItem || !targetItem.id) return [];
  const items = allItems || getPortalItems();
  const tickets = getHandoverTickets();
  const oppositeType = targetItem.type === 'Lost' ? 'Found' : 'Lost';

  const candidates = items.filter(
    (i) => i && i.id !== targetItem.id && i.type === oppositeType
  );

  const matchedPairs: Array<{ item: Item; score: number }> = [];

  for (const candidate of candidates) {
    let score = 0;
    let isExplicitPair = false;

    // 1. Direct AI match engine score
    const lost = targetItem.type === 'Lost' ? targetItem : candidate;
    const found = targetItem.type === 'Found' ? targetItem : candidate;
    try {
      const matchAnalysis = calculateMatchScore(lost, found);
      score = matchAnalysis.score;
    } catch {
      score = 0;
    }

    // 2. Ticket Linkage: Check if a handover ticket links targetItem and candidate's owner
    const targetTicket = tickets.find((t) => t.itemId === targetItem.id);
    if (targetTicket) {
      if (
        (candidate.userRoll && targetTicket.claimantRoll && candidate.userRoll.trim().toLowerCase() === targetTicket.claimantRoll.trim().toLowerCase()) ||
        (candidate.userId && targetTicket.claimantId && candidate.userId === targetTicket.claimantId) ||
        (candidate.userEmail && targetTicket.claimantEmail && candidate.userEmail.trim().toLowerCase() === targetTicket.claimantEmail.trim().toLowerCase())
      ) {
        isExplicitPair = true;
        score += 50;
      }
    }

    const candidateTicket = tickets.find((t) => t.itemId === candidate.id);
    if (candidateTicket) {
      if (
        (targetItem.userRoll && candidateTicket.claimantRoll && targetItem.userRoll.trim().toLowerCase() === candidateTicket.claimantRoll.trim().toLowerCase()) ||
        (targetItem.userId && candidateTicket.claimantId && targetItem.userId === candidateTicket.claimantId) ||
        (targetItem.userEmail && candidateTicket.claimantEmail && targetItem.userEmail.trim().toLowerCase() === candidateTicket.claimantEmail.trim().toLowerCase())
      ) {
        isExplicitPair = true;
        score += 50;
      }
    }

    // 3. Category + Key word overlap
    if (targetItem.category === candidate.category) {
      const getKeywords = (str: string) =>
        (str || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !['found', 'lost', 'item', 'with', 'and', 'the', 'for'].includes(w));
      const targetWords = getKeywords(targetItem.title);
      const candidateWords = getKeywords(candidate.title);
      const commonWords = targetWords.filter((w) => candidateWords.includes(w));
      if (commonWords.length > 0) {
        score += commonWords.length * 15;
      }
    }

    // 4. Color / Brand match boost
    if (targetItem.color && candidate.color && targetItem.color.toLowerCase() === candidate.color.toLowerCase()) {
      score += 10;
    }
    if (targetItem.brand && candidate.brand && targetItem.brand.toLowerCase() === candidate.brand.toLowerCase()) {
      score += 15;
    }

    if (isExplicitPair || score >= 40) {
      matchedPairs.push({ item: candidate, score });
    }
  }

  // Sort by score descending
  matchedPairs.sort((a, b) => b.score - a.score);
  return matchedPairs.map((m) => m.item);
}

export function updatePortalItemStatus(
  itemId: string,
  newStatus: ItemLifecycleStatus,
  note: string,
  actor: string,
  options?: { skipPairSync?: boolean }
): Item | null {
  const items = getPortalItems();
  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) return null;

  const item = items[index];
  const now = new Date().toISOString();
  item.status = newStatus;
  item.updatedAt = now;
  item.historyLog.push({
    status: newStatus,
    timestamp: now,
    note: note || `Status updated to ${newStatus}`,
    actor: actor || 'Campus Portal',
  });

  items[index] = item;
  writeStorage(STORAGE_KEYS.ITEMS, items);

  // Notify item owner
  createNotification({
    userId: item.userId,
    title: `Item Status Updated: ${newStatus}`,
    message: `"${item.title}" is now marked as ${newStatus}. Note: ${note}`,
    type: 'status_change',
    itemId: item.id,
  });

  // Sync to server database in background
  if (typeof window !== 'undefined') {
    fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: item.id,
        status: newStatus,
        historyLog: item.historyLog,
      }),
    }).catch((err) => console.error('Failed to sync item status to server:', err));
  }

  // Automatic Pair Synchronization on 'Returned'
  if (newStatus === 'Returned' && !options?.skipPairSync) {
    const pairs = findPairedItems(item, items);
    for (const pair of pairs) {
      if (pair.status !== 'Returned') {
        updatePortalItemStatus(
          pair.id,
          'Returned',
          `Paired item status synchronized to Returned: Matching "${item.title}" was completed by ${actor}.`,
          actor,
          { skipPairSync: true }
        );
      }
    }
  }

  return item;
}

export function deletePortalItem(itemId: string): void {
  const items = getPortalItems();
  const filtered = items.filter(i => i.id !== itemId);
  writeStorage(STORAGE_KEYS.ITEMS, filtered);
}

// ----------------- USER & PROFILE -----------------

export const ADMIN_CREDENTIALS = {
  email: 'arindammohanty100@gmail.com',
  password: 'Am@HIG425',
  name: 'Arindam Mohanty',
  rollNumber: '250301120059',
  role: 'helpdesk_admin' as const,
  department: 'Campus Collection Desk & Student Services',
  branch: 'Campus Security & Lost & Found Operations',
  phone: '+91 98765 43210',
};

export const ADMIN_USER: User = {
  id: 'admin-arindam-mohanty',
  name: ADMIN_CREDENTIALS.name,
  email: ADMIN_CREDENTIALS.email,
  rollNumber: ADMIN_CREDENTIALS.rollNumber,
  department: ADMIN_CREDENTIALS.department,
  branch: ADMIN_CREDENTIALS.branch,
  role: ADMIN_CREDENTIALS.role,
  phone: ADMIN_CREDENTIALS.phone,
  avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Arindam%20Mohanty',
};

export function getPortalUsers(): User[] {
  const users = readStorage<User[]>(STORAGE_KEYS.USERS, []);
  // Ensure the Admin Account is always present in users list and has role 'helpdesk_admin'
  const adminIndex = users.findIndex(
    (u) => u.email && u.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()
  );
  if (adminIndex === -1) {
    users.unshift(ADMIN_USER);
    writeStorage(STORAGE_KEYS.USERS, users);
  } else if (users[adminIndex].role !== 'helpdesk_admin') {
    users[adminIndex].role = 'helpdesk_admin';
    writeStorage(STORAGE_KEYS.USERS, users);
  }
  return users;
}

export function getActiveUser(): User | null {
  const user = readStorage<User | null>(STORAGE_KEYS.CURRENT_USER, null);
  if (!user || !user.id || !user.name) {
    return null;
  }
  return user;
}

export function setActiveUser(user: User): void {
  writeStorage(STORAGE_KEYS.CURRENT_USER, user);
}

/**
 * Checks whether an item is owned / reported by the specified user.
 * Matches across:
 * 1. Exact user ID (`item.userId === user.id`)
 * 2. University Registration Number (`item.userRoll === user.rollNumber`)
 * 3. Campus Email (`item.userEmail === user.email`)
 * 4. User Roll embedded in item.userName or item.userId
 */
export function isItemOwnedByUser(
  item: Item | null | undefined,
  user: User | null | undefined
): boolean {
  if (!item || !user) return false;

  // 1. Exact user ID match
  if (item.userId && user.id && item.userId === user.id) {
    return true;
  }

  // 2. Canonical University Registration Number match (e.g., 250301120059)
  const normUserRoll = user.rollNumber?.trim().toLowerCase();
  const normItemRoll = item.userRoll?.trim().toLowerCase();
  if (normUserRoll && normItemRoll && normUserRoll === normItemRoll) {
    return true;
  }

  // 3. Official Email match
  const normUserEmail = user.email?.trim().toLowerCase();
  const normItemEmail = item.userEmail?.trim().toLowerCase();
  if (normUserEmail && normItemEmail && normUserEmail === normItemEmail) {
    return true;
  }

  // 4. Substring roll check (for guest/legacy entries like 'Student (250301120059)')
  if (normUserRoll && normUserRoll.length >= 6) {
    if (item.userName && item.userName.toLowerCase().includes(normUserRoll)) {
      return true;
    }
    if (item.userId && item.userId.toLowerCase().includes(normUserRoll)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates item age in days based on report date or creation timestamp.
 */
export function getItemAgeInDays(item: Item | null | undefined): number {
  if (!item) return 0;
  const dateStr = item.date || item.createdAt;
  if (!dateStr) return 0;
  const parsed = new Date(dateStr).getTime();
  if (isNaN(parsed)) return 0;
  const diffMs = Date.now() - parsed;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Determines whether an item transitions automatically to the Archive section:
 * 1. Explicitly marked as 'Archived'
 * 2. Returned / Reunited items (lifecycle completed)
 * 3. Lost items older than 60 days (60-day auto-archive policy)
 * 4. Found items older than 60 days or marked Returned/Archived
 */
export function isItemArchived(item: Item | null | undefined): boolean {
  if (!item) return false;
  if (item.status === 'Archived') return true;
  if (item.status === 'Returned') return true;

  const ageDays = getItemAgeInDays(item);
  if (ageDays >= 60) {
    return true;
  }

  return false;
}

export function registerPortalUser(userData: Omit<User, 'id'> & { id?: string }): User {
  const users = getPortalUsers();
  const normalizedRoll = userData.rollNumber?.trim().toLowerCase();
  const normalizedEmail = userData.email?.trim().toLowerCase();

  const existingIdx = users.findIndex(
    (u) =>
      (normalizedEmail && u.email && u.email.toLowerCase() === normalizedEmail) ||
      (normalizedRoll && u.rollNumber && u.rollNumber.toLowerCase() === normalizedRoll)
  );

  const isSuperAdmin = normalizedEmail === ADMIN_CREDENTIALS.email.toLowerCase();

  const canonicalId =
    isSuperAdmin
      ? ADMIN_USER.id
      : userData.id ||
        (existingIdx >= 0 && users[existingIdx].id
          ? users[existingIdx].id
          : normalizedRoll
          ? `user-${normalizedRoll}`
          : normalizedEmail
          ? `user-${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`
          : `user-${Date.now()}`);

  const newUser: User = {
    id: canonicalId,
    name: isSuperAdmin ? ADMIN_CREDENTIALS.name : userData.name,
    email: userData.email,
    rollNumber: isSuperAdmin ? ADMIN_CREDENTIALS.rollNumber : userData.rollNumber,
    branch: (userData as any).branch || userData.department || 'General Academics',
    department: isSuperAdmin ? ADMIN_CREDENTIALS.department : (userData.department || (userData as any).branch || 'General Academics'),
    role: isSuperAdmin ? 'helpdesk_admin' : (userData.role || 'student'),
    year: userData.year,
    phone: userData.phone || (isSuperAdmin ? ADMIN_CREDENTIALS.phone : undefined),
    avatarUrl:
      userData.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(isSuperAdmin ? ADMIN_CREDENTIALS.name : userData.name)}`,
  };

  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...newUser };
  } else {
    users.push(newUser);
  }
  writeStorage(STORAGE_KEYS.USERS, users);
  setActiveUser(newUser);
  return newUser;
}

export function signOutPortalUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

// ----------------- HANDOVER TICKETS -----------------

export const INITIAL_DEMO_TICKETS: HandoverTicket[] = [
  {
    id: 'ticket-claim-watch-01',
    itemId: '4aec5e7c-0d26-467b-b96e-f13850f56cba',
    itemTitle: 'Found Silver Wristwatch with Dial',
    itemType: 'Found',
    claimantId: 'user-250301120059',
    claimantName: 'Student Claimant',
    claimantEmail: 'student@campus.edu',
    claimantRoll: '250301120059',
    secretDetailProof: 'Watch has silver link bracelet by Lee Cooper London. The clasp has engraved initials "AM-26" and a minor hairline mark at the 4 o\'clock marker.',
    handoverCode: '746430',
    helpDeskLocation: 'Student Center & Cafeteria Help Desk',
    scheduledTime: 'Immediate / Pending Review',
    status: 'Pending Verification',
    createdAt: new Date().toISOString(),
  },
];

export function getHandoverTickets(): HandoverTicket[] {
  const tickets = readStorage<HandoverTicket[]>(STORAGE_KEYS.TICKETS, INITIAL_DEMO_TICKETS);
  if (!tickets || tickets.length === 0) {
    writeStorage(STORAGE_KEYS.TICKETS, INITIAL_DEMO_TICKETS);
    return INITIAL_DEMO_TICKETS;
  }
  return tickets;
}

export function createHandoverTicket(
  item: Item,
  claimant: User,
  secretDetailProof: string,
  helpDeskLocation: string = 'Central Library Help Desk'
): HandoverTicket {
  const tickets = getHandoverTickets();
  const now = new Date().toISOString();
  const ticketId = `ticket-${Date.now()}`;

  const newTicket: HandoverTicket = {
    id: ticketId,
    itemId: item.id,
    itemTitle: item.title,
    itemType: item.type,
    claimantId: claimant.id,
    claimantName: claimant.name,
    claimantEmail: claimant.email,
    claimantRoll: claimant.rollNumber,
    secretDetailProof,
    handoverCode: item.handoverCode || Math.floor(100000 + Math.random() * 900000).toString(),
    helpDeskLocation,
    scheduledTime: 'Immediate / Next Business Hours',
    status: 'Pending Verification',
    createdAt: now,
  };

  tickets.unshift(newTicket);
  writeStorage(STORAGE_KEYS.TICKETS, tickets);

  // Update item status to 'In Handover'
  updatePortalItemStatus(
    item.id,
    'In Handover',
    `Handover ticket #${ticketId.slice(-6)} created for verification at ${helpDeskLocation}.`,
    claimant.name
  );

  return newTicket;
}

const clientDeskLockouts = new Map<string, { attempts: number; lockedUntil?: number }>();

export function verifyHandoverAtDesk(
  ticketIdOrItemId: string,
  enteredCode: string,
  officerName: string
): { success: boolean; message: string; ticket?: HandoverTicket } {
  const now = Date.now();
  let lockout = clientDeskLockouts.get(ticketIdOrItemId);
  if (lockout && lockout.lockedUntil && now < lockout.lockedUntil) {
    const minsLeft = Math.ceil((lockout.lockedUntil - now) / 60000);
    return { success: false, message: `Ticket is locked due to too many failed attempts. Try again in ${minsLeft} minute(s).` };
  } else if (lockout && lockout.lockedUntil && now >= lockout.lockedUntil) {
    lockout.attempts = 0;
    lockout.lockedUntil = undefined;
  }

  const tickets = getHandoverTickets();
  const ticketIndex = tickets.findIndex(t => t.id === ticketIdOrItemId || t.itemId === ticketIdOrItemId);
  let ticket = ticketIndex !== -1 ? tickets[ticketIndex] : undefined;

  const items = getPortalItems();
  const targetItem = items.find(i => i.id === ticketIdOrItemId || (ticket && i.id === ticket.itemId));

  const validPin = ticket?.handoverCode || targetItem?.handoverCode;
  if (!validPin) {
    return { success: false, message: 'No registered handover PIN found for this item.' };
  }

  if (validPin.trim() !== enteredCode.trim()) {
    if (!lockout) lockout = { attempts: 0 };
    lockout.attempts += 1;
    if (lockout.attempts >= 5) {
      lockout.lockedUntil = now + 15 * 60 * 1000;
      clientDeskLockouts.set(ticketIdOrItemId, lockout);
      return { success: false, message: 'Too many incorrect attempts. Ticket locked for 15 minutes.' };
    }
    clientDeskLockouts.set(ticketIdOrItemId, lockout);
    return { success: false, message: `Invalid 6-digit security handover code. (${5 - lockout.attempts} attempts remaining)` };
  }

  // Clear attempts on success
  clientDeskLockouts.delete(ticketIdOrItemId);

  if (ticket) {
    ticket.status = 'Completed';
    ticket.officerNotes = `Verified and handed over in person by ${officerName}.`;
    tickets[ticketIndex] = ticket;
    writeStorage(STORAGE_KEYS.TICKETS, tickets);
  }

  if (targetItem) {
    updatePortalItemStatus(
      targetItem.id,
      'Returned',
      `Item verified and handed over at ${ticket?.helpDeskLocation || targetItem.location || 'Campus Help Desk'}. Case successfully closed.`,
      officerName,
      { skipPairSync: true }
    );

    // Sync paired items
    const pairs = findPairedItems(targetItem);
    for (const pairedItem of pairs) {
      if (pairedItem.status !== 'Returned') {
        updatePortalItemStatus(
          pairedItem.id,
          'Returned',
          `Item pair reconciled: Matching item "${targetItem.title}" verified via counter PIN by Officer ${officerName}. Case closed.`,
          officerName,
          { skipPairSync: true }
        );
        const allT = getHandoverTickets();
        let ticketsChanged = false;
        allT.forEach((t) => {
          if (t.itemId === pairedItem.id && t.status !== 'Completed') {
            t.status = 'Completed';
            t.officerNotes = `Counter PIN verified by Officer ${officerName}.`;
            ticketsChanged = true;
          }
        });
        if (ticketsChanged) {
          writeStorage(STORAGE_KEYS.TICKETS, allT);
        }
        createNotification({
          userId: pairedItem.userId,
          title: 'Item Pair Reunited & Closed!',
          message: `Your reported ${pairedItem.type.toLowerCase()} item "${pairedItem.title}" has been marked Returned via desk counter verification.`,
          type: 'handover',
          itemId: pairedItem.id,
        });
      }
    }
  }

  return { success: true, message: 'Handover verified successfully! Item pair marked as Returned.', ticket };
}

/**
 * Accepts and verifies a collection request / claim for a campus collection desk.
 * Only callable by Campus Collection Desk Officers / Admin.
 */
export function acceptClaimRequest(
  ticketId: string,
  officerName: string = 'Arindam Mohanty',
  notes?: string
): { success: boolean; message: string; ticket?: HandoverTicket; pairedItems?: Item[] } {
  const tickets = getHandoverTickets();
  const ticketIndex = tickets.findIndex((t) => t.id === ticketId);
  if (ticketIndex === -1) {
    return { success: false, message: 'Claim ticket not found.' };
  }

  const ticket = tickets[ticketIndex];
  ticket.status = 'Completed';
  ticket.officerNotes = notes || `Collection request approved & verified by Campus Admin (${officerName}). Item released to claimant.`;
  tickets[ticketIndex] = ticket;
  writeStorage(STORAGE_KEYS.TICKETS, tickets);

  // 1. Update primary claimed item status to 'Returned'
  const primaryItem = updatePortalItemStatus(
    ticket.itemId,
    'Returned',
    `Collection request accepted at ${ticket.helpDeskLocation}. Verified and released to claimant ${ticket.claimantName} (${ticket.claimantRoll}).`,
    officerName,
    { skipPairSync: true }
  );

  // 2. Synchronize Paired Item States
  const allCurrentItems = getPortalItems();
  const targetItem = allCurrentItems.find((i) => i.id === ticket.itemId) || primaryItem;
  const pairedUpdated: Item[] = [];

  if (targetItem) {
    const pairs = findPairedItems(targetItem, allCurrentItems);
    for (const pairedItem of pairs) {
      if (pairedItem.status !== 'Returned') {
        const updated = updatePortalItemStatus(
          pairedItem.id,
          'Returned',
          `Item pair reconciled: Matching ${targetItem.type.toLowerCase()} item "${targetItem.title}" collection was accepted and released at ${ticket.helpDeskLocation} by Officer ${officerName}. Reunited with owner.`,
          officerName,
          { skipPairSync: true }
        );
        if (updated) {
          pairedUpdated.push(updated);
        }

        // Auto-complete any pending ticket for the paired item
        const allT = getHandoverTickets();
        let ticketsChanged = false;
        allT.forEach((t) => {
          if (t.itemId === pairedItem.id && t.status !== 'Completed') {
            t.status = 'Completed';
            t.officerNotes = `Automatically completed via paired item handover verification (#${ticket.id.slice(-6)}).`;
            ticketsChanged = true;
          }
        });
        if (ticketsChanged) {
          writeStorage(STORAGE_KEYS.TICKETS, allT);
        }

        // Notify paired item reporter
        createNotification({
          userId: pairedItem.userId,
          title: 'Paired Item Case Closed & Reunited!',
          message: `Great news! Your reported ${pairedItem.type.toLowerCase()} item "${pairedItem.title}" has been closed and marked as Returned following verification at ${ticket.helpDeskLocation}.`,
          type: 'handover',
          itemId: pairedItem.id,
        });
      }
    }
  }

  // 3. Send notification to claimant
  createNotification({
    userId: ticket.claimantId,
    title: 'Claim Request Accepted & Ready',
    message: `Your collection request for "${ticket.itemTitle}" has been approved by ${officerName} at ${ticket.helpDeskLocation}. You may collect the item.`,
    type: 'handover',
    itemId: ticket.itemId,
  });

  const pairText = pairedUpdated.length > 0 
    ? ` and paired ${pairedUpdated[0].type.toLowerCase()} item "${pairedUpdated[0].title}"` 
    : '';

  return {
    success: true,
    message: `Collection request accepted for "${ticket.itemTitle}". Item${pairText} marked as Returned.`,
    ticket,
    pairedItems: pairedUpdated,
  };
}

/**
 * Rejects a student claim request when proof does not match.
 */
export function rejectClaimRequest(
  ticketId: string,
  officerName: string = 'Arindam Mohanty',
  reason: string = 'Proof of ownership details did not match item verification criteria.'
): { success: boolean; message: string; ticket?: HandoverTicket } {
  const tickets = getHandoverTickets();
  const ticketIndex = tickets.findIndex((t) => t.id === ticketId);
  if (ticketIndex === -1) {
    return { success: false, message: 'Claim ticket not found.' };
  }

  const ticket = tickets[ticketIndex];
  ticket.status = 'Rejected';
  ticket.officerNotes = `Claim rejected by ${officerName}: ${reason}`;
  tickets[ticketIndex] = ticket;
  writeStorage(STORAGE_KEYS.TICKETS, tickets);

  // Send notification to claimant
  createNotification({
    userId: ticket.claimantId,
    title: 'Claim Request Status Update',
    message: `Your claim request for "${ticket.itemTitle}" was reviewed at ${ticket.helpDeskLocation}: ${reason}`,
    type: 'handover',
    itemId: ticket.itemId,
  });

  return {
    success: true,
    message: `Claim request rejected. Claimant notified.`,
    ticket,
  };
}

// ----------------- SECURE CHAT -----------------

export function getChatThreadsForItem(itemId: string): { claimantId: string; claimantName?: string }[] {
  const allMessages = readStorage<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []);
  const threadMap = new Map<string, { claimantId: string; claimantName?: string }>();
  for (const m of allMessages) {
    if (m.itemId === itemId && m.threadId && m.threadId.startsWith(`${itemId}_`)) {
      const cId = m.threadId.replace(`${itemId}_`, '');
      if (!threadMap.has(cId)) {
        threadMap.set(cId, {
          claimantId: cId,
          claimantName: m.senderId === cId ? m.senderName : undefined,
        });
      }
    }
  }
  return Array.from(threadMap.values());
}

export function getChatMessages(itemId: string, claimantId?: string): ChatMessage[] {
  const allMessages = readStorage<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []);
  return allMessages.filter(m => {
    if (m.itemId !== itemId) return false;
    // If claimantId is specified, isolate to that claimant's thread or system messages
    if (claimantId) {
      if (m.isSystem) return true;
      return m.threadId === `${itemId}_${claimantId}`;
    }
    return true;
  });
}

export function sendChatMessage(
  itemId: string,
  sender: User,
  senderRole: 'finder' | 'owner' | 'helpdesk',
  text: string,
  claimantId?: string
): ChatMessage {
  const allMessages = readStorage<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []);
  const now = new Date().toISOString();
  const threadId = claimantId ? `${itemId}_${claimantId}` : `${itemId}_${sender.id}`;

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    itemId,
    threadId,
    senderId: sender.id,
    senderName: sender.name,
    senderRole,
    text: text.trim(),
    timestamp: now,
  };

  allMessages.push(newMsg);
  writeStorage(STORAGE_KEYS.MESSAGES, allMessages);
  return newMsg;
}

// ----------------- NOTIFICATIONS -----------------

export function getPortalNotifications(userId?: string): PlatformNotification[] {
  const all = readStorage<PlatformNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  if (!userId) return all;
  return all.filter(n => n.userId === userId || n.userId === 'all');
}

export function createNotification(notif: Omit<PlatformNotification, 'id' | 'createdAt' | 'read'>): PlatformNotification {
  const all = readStorage<PlatformNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  const newNotif: PlatformNotification = {
    id: `notif-${Date.now()}`,
    ...notif,
    read: false,
    createdAt: new Date().toISOString(),
  };
  all.unshift(newNotif);
  writeStorage(STORAGE_KEYS.NOTIFICATIONS, all);
  return newNotif;
}

export function markNotificationAsRead(id: string): void {
  const all = readStorage<PlatformNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  const item = all.find(n => n.id === id);
  if (item) {
    item.read = true;
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, all);
  }
}

export function resetToSeedData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.ITEMS);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.TICKETS);
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  initializePortalStorage();
}
