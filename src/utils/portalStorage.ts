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

export function updatePortalItemStatus(
  itemId: string,
  newStatus: ItemLifecycleStatus,
  note: string,
  actor: string
): Item | null {
  const items = getPortalItems();
  const index = items.findIndex(i => i.id === itemId);
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

  return item;
}

export function deletePortalItem(itemId: string): void {
  const items = getPortalItems();
  const filtered = items.filter(i => i.id !== itemId);
  writeStorage(STORAGE_KEYS.ITEMS, filtered);
}

// ----------------- USER & PROFILE -----------------

export function getPortalUsers(): User[] {
  return readStorage<User[]>(STORAGE_KEYS.USERS, []);
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

export function registerPortalUser(userData: Omit<User, 'id'> & { id?: string }): User {
  const users = getPortalUsers();
  const newUser: User = {
    id: userData.id || `user-${Date.now()}`,
    name: userData.name,
    email: userData.email,
    rollNumber: userData.rollNumber,
    branch: (userData as any).branch || userData.department || 'General Academics',
    department: userData.department || (userData as any).branch || 'General Academics',
    role: userData.role || 'student',
    year: userData.year,
    phone: userData.phone,
    avatarUrl: userData.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`,
  };

  const existingIdx = users.findIndex(
    u => (u.email && u.email.toLowerCase() === newUser.email.toLowerCase()) || 
         (u.rollNumber && u.rollNumber.toLowerCase() === newUser.rollNumber.toLowerCase())
  );
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

export function getHandoverTickets(): HandoverTicket[] {
  return readStorage<HandoverTicket[]>(STORAGE_KEYS.TICKETS, []);
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
      officerName
    );
  }

  return { success: true, message: 'Handover verified successfully! Item marked as Returned.', ticket };
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
