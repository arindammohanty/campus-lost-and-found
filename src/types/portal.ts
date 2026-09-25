export type ItemType = 'Lost' | 'Found';

export type ItemLifecycleStatus = 
  | 'Reported'
  | 'Under Review'
  | 'Active'
  | 'Match Found'
  | 'In Handover'
  | 'Returned';

export type CategoryType = 
  | 'Electronics' 
  | 'ID Cards' 
  | 'Books' 
  | 'Wallet' 
  | 'Keys' 
  | 'Accessories' 
  | 'Clothing' 
  | 'Bags' 
  | 'Documents' 
  | 'Other';

export type ContactPreference = 'In-App Chat' | 'Email Alerts' | 'SMS Alerts';

export interface CampusLocation {
  id: string;
  name: string;
  code: string;
  zone: 'North' | 'Central' | 'South' | 'East' | 'West';
  mapX: number; // Percentage coordinate on campus map (0-100)
  mapY: number; // Percentage coordinate on campus map (0-100)
  description: string;
  hasHelpDesk: boolean;
}

export interface StatusHistoryEntry {
  status: ItemLifecycleStatus;
  timestamp: string;
  note: string;
  actor: string;
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  category: CategoryType;
  brand?: string;
  color?: string;
  description: string;
  location: string;
  locationDetails?: string; // Room / specific spot e.g. "Room 204", "Near Counter"
  mapX?: number; // Map pin coordinates
  mapY?: number;
  date: string; // YYYY-MM-DD
  time?: string;
  contactPreference: ContactPreference;
  imageUrl?: string;
  identifyingDetails?: string; // Secret / private detail to verify ownership
  
  status: ItemLifecycleStatus;
  historyLog: StatusHistoryEntry[];
  
  // AI / Multimodal Features
  aiTags?: string[];
  aiConfidence?: number;
  aiEmbedding?: number[]; // 512-dim CLIP vector
  
  // Handover & Verification
  handoverCode?: string; // 6-digit security PIN for Help Desk handover
  qrCodeDataUrl?: string; // Scannable QR code
  helpDeskLocation?: string;
  
  // User references (Private / Shielded)
  userId: string;
  userName: string;
  userEmail: string;
  userRoll: string;
  userPhone?: string;

  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  branch: string;
  year: string;
  phone: string;
  role: 'student' | 'helpdesk_admin';
}

export interface MatchResult {
  lostItem: Item;
  foundItem: Item;
  score: number; // 0 to 100
  reasons: string[];
  similarity?: number;
}

export interface ChatMessage {
  id: string;
  itemId: string;
  threadId?: string; // ${itemId}_${claimantId} for private claimant-finder thread
  senderId: string;
  senderName: string;
  senderRole: 'finder' | 'owner' | 'helpdesk';
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface HandoverTicket {
  id: string;
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  claimantId: string;
  claimantName: string;
  claimantEmail: string;
  claimantRoll: string;
  secretDetailProof: string;
  handoverCode: string;
  qrCodeDataUrl?: string;
  helpDeskLocation: string;
  scheduledTime?: string;
  status: 'Pending Verification' | 'Verified & Ready' | 'Completed' | 'Rejected';
  officerNotes?: string;
  createdAt: string;
}

export interface PlatformNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'match' | 'status_change' | 'chat' | 'handover';
  itemId?: string;
  read: boolean;
  createdAt: string;
}
