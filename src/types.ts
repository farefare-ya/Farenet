export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface ReplyPreview {
  id: string;
  text: string;
  senderName: string;
  type?: "text" | "image" | "gif";
}

export interface Message {
  id: string;
  type?: "text" | "image" | "gif";
  text: string;
  imageData?: string | null;
  senderId: string;
  senderName: string;
  timestamp: any;
  read: boolean;
  deleted?: boolean;
  replyTo?: ReplyPreview | null;
}

export interface Chat {
  id: string;
  name: string;
  members: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  lastSenderId?: string;
  isGroup: boolean;
  photoURL?: string | null;
  createdAt?: any;
  admins?: string[];
  typing?: { [uid: string]: boolean };
  wallpaper?: string | null;
  announcement?: string | null;
  pinnedMessage?: ReplyPreview | null;
  isPublic?: boolean;
  passwordHash?: string | null;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  bio?: string;
  online?: boolean;
  lastSeen?: any;
  blockedUsers?: string[];
  contacts?: string[];
}
