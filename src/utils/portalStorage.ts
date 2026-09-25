import { Item, User, HandoverTicket, ChatMessage, PlatformNotification, ItemLifecycleStatus } from '../types/portal';
import { INITIAL_ITEMS, SAMPLE_USERS } from '../data/campusData';
import { extractAIFeatures, calculateMatchScore } from './aiEngine';

const STORAGE_KEYS = {
  ITEMS: 'campus_portal_items_v2',
  USERS: 'campus_portal_users_v2',
  CURRENT_USER: 'campus_portal_active_user_v2',
  TICKETS: 'campus_portal_tickets_v2',
  MESSAGES: 'campus_portal_messages_v2',
  NOTIFICATIONS: 'campus_portal_notifications_v2',
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
 * Initialize storage with rich seed data if empty
 */
export function initializePortalStorage(): void {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(STORAGE_KEYS.ITEMS);
  if (!existing) {
    writeStorage(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
    writeStorage(STORAGE_KEYS.USERS, SAMPLE_USERS);
    writeStorage(STORAGE_KEYS.CURRENT_USER, SAMPLE_USERS[0]); // Default to Arindam Mohanty
    
    // Seed an initial handover ticket for demonstration
    const initialTicket: HandoverTicket = {
      id: 'ticket-demo-1',
      itemId: 'item-found-1',
      itemTitle: 'Found Casio Scientific Calculator (fx-991CW)',
      itemType: 'Found',
      claimantId: 'user-arindam',
      claimantName: 'Arindam Mohanty',
      claimantEmail: 'arindam.mohanty@campus.edu',
      claimantRoll: '250301120059',
      secretDetailProof: 'Small silver initials sticker "AM" on the battery cover',
      handoverCode: '482910',
      helpDeskLocation: 'Central Library Help Desk',
      scheduledTime: 'Today at 04:00 PM',
      status: 'Pending Verification',
      officerNotes: 'Claimant reported lost calculator matching serial and markings.',
      createdAt: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEYS.TICKETS, [initialTicket]);

    // Seed initial message thread
    const initialMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        itemId: 'item-lost-1',
        senderId: 'system',
        senderName: 'Campus Match Radar',
        senderRole: 'helpdesk',
        text: 'System: A 96% match was detected for this listing. Contact between finder and claimant has been securely initialized.',
        timestamp: '2026-09-25T09:12:00Z',
        isSystem: true,
      },
      {
        id: 'msg-2',
        itemId: 'item-lost-1',
        senderId: 'user-amrit',
        senderName: 'Finder (Amrit Rout)',
        senderRole: 'finder',
        text: 'Hi! I found a Casio fx-991CW calculator in the Central Library 2nd floor and handed it over to the Library Desk counter for safety.',
        timestamp: '2026-09-25T09:15:00Z',
      },
      {
        id: 'msg-3',
        itemId: 'item-lost-1',
        senderId: 'user-arindam',
        senderName: 'Owner (Arindam Mohanty)',
        senderRole: 'owner',
        text: 'Thank you so much! Does it have silver AM initials on the back? I generated the help desk handover pass to pick it up.',
        timestamp: '2026-09-25T09:18:00Z',
      },
    ];
    writeStorage(STORAGE_KEYS.MESSAGES, initialMessages);

    // Initial notification
    const initialNotifications: PlatformNotification[] = [
      {
        id: 'notif-1',
        userId: 'user-arindam',
        title: 'High-Probability Match Found! (96%)',
        message: 'Your lost Casio fx-991CW calculator matches an item deposited at Central Library Help Desk.',
        type: 'match',
        itemId: 'item-lost-1',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
  }
}

// ----------------- ITEM OPERATIONS -----------------

export function getPortalItems(): Item[] {
  return readStorage<Item[]>(STORAGE_KEYS.ITEMS, INITIAL_ITEMS);
}

export function getPortalItemById(id: string): Item | undefined {
  const items = getPortalItems();
  return items.find(i => i.id === id);
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
  return readStorage<User[]>(STORAGE_KEYS.USERS, SAMPLE_USERS);
}

export function getActiveUser(): User {
  return readStorage<User>(STORAGE_KEYS.CURRENT_USER, SAMPLE_USERS[0]);
}

export function setActiveUser(user: User): void {
  writeStorage(STORAGE_KEYS.CURRENT_USER, user);
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

export function verifyHandoverAtDesk(
  ticketIdOrItemId: string,
  enteredCode: string,
  officerName: string
): { success: boolean; message: string; ticket?: HandoverTicket } {
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
    return { success: false, message: 'Invalid 6-digit security handover code.' };
  }

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

export function getChatMessages(itemId: string, claimantId?: string): ChatMessage[] {
  const allMessages = readStorage<ChatMessage[]>(STORAGE_KEYS.MESSAGES, []);
  return allMessages.filter(m => {
    if (m.itemId !== itemId) return false;
    // If claimantId is specified, isolate to that claimant's thread or system messages
    if (claimantId && m.threadId) {
      return m.threadId === `${itemId}_${claimantId}` || m.isSystem;
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
