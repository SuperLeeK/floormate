export type UserStatus = 'online' | 'busy' | 'away' | 'sleep';

export type CharacterType = 'cat' | 'coffee' | 'dog' | 'egg' | 'frog' | 'hamburger' | 'makarong' | 'octopus' | 'ramen';

export type BubbleTheme = 'default' | 'neon-dark' | 'retro-pixel' | 'cyber-pink';
export type ThrowItemType = 'bomb' | 'stone' | 'heart' | 'lightning' | 'star' | 'waterball';

export interface UserProfile {
  id: string;
  name: string;
  avatar: CharacterType;
  status: UserStatus;
  customMessage?: string;
  joinedAt?: number;
}

export interface RoomUser extends UserProfile {
  socketId: string;
}

export interface MessagePayload {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  targetUserId?: string;
  timestamp: number;
}

export interface PokePayload {
  id: string;
  senderId: string;
  senderName: string;
  targetUserId: string;
  pokeType: 'poke' | 'pat' | 'heart' | 'water' | 'snack' | 'stone';
  timestamp: number;
}

export interface ChatHistoryItem {
  id: string;
  roomId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: CharacterType;
  text: string;
  timestamp: number;
  isMe?: boolean;
}

export type NameTagPosition = 'bottom' | 'top' | 'hidden';

export interface DisplayInfo {
  id: number;
  label: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface WalkingArea {
  minPercent: number; // 0 ~ 100
  maxPercent: number; // 0 ~ 100
}

export interface RecentRoomItem {
  code: string;
  name: string;
}

export interface BotConfig {
  id: string;
  name: string;
  avatar: CharacterType;
  messages: string[];
  typingDelaySec: number; // 타이핑 말풍선 노출 시간 (초)
  intervalSec: number; // 발송 주기 (초)
  enabled: boolean;
}

export interface AppSettings {
  serverUrl: string;
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  userAvatar: CharacterType;
  dockSide: 'right' | 'left';
  soundEnabled: boolean;
  maxBubbleCount: number; // 1 ~ 5 (기본: 2)
  bubbleDurationSec: number; // 3 ~ 30 (기본: 6)
  nameTagPosition: NameTagPosition; // 'bottom' | 'top' | 'hidden'
  nameTagSpacing: number; // 0 ~ 24 (px, 기본: 2)
  selectedDisplayId?: number;
  walkingArea: WalkingArea; // 기본: { minPercent: 0, maxPercent: 100 }
  recentRooms: RecentRoomItem[];
  bots?: BotConfig[];
  bubbleTheme?: BubbleTheme; // 기본 말풍선, 네온 다크, 레트로 픽셀, 사이버 핑크
  throwItem?: ThrowItemType; // 기본 폭탄 💣, 돌멩이 🪨, 하트 💖, 번개 ⚡ 등
}

declare global {
  interface Window {
    electronAPI?: {
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
      minimizeWindow: () => void;
      closeWindow: () => void;
      openSettingsWindow: () => void;
      openChatInputWindow: () => void;
      closeChatInputWindow: () => void;
      closeSettingsWindow: () => void;
      openHistoryWindow?: () => void;
      closeHistoryWindow?: () => void;
      openPreviewWindow?: () => void;
      closePreviewWindow?: () => void;
      sendChatMessage: (text: string) => void;
      sendTyping: (isTyping: boolean) => void;
      onChatTyping: (callback: (isTyping: boolean) => void) => (() => void) | void;
      saveSettings: (settings: AppSettings) => void;
      onReceiveChatMessage: (callback: (text: string) => void) => (() => void) | void;
      onSettingsUpdated: (callback: (settings: AppSettings) => void) => (() => void) | void;
      onStatusChangedFromTray: (callback: (status: UserStatus) => void) => (() => void) | void;
      updateTrayStatus?: (status: UserStatus) => void;
      getDisplays?: () => Promise<DisplayInfo[]>;
      setDisplayId?: (displayId: number) => void;
      previewWalkingArea?: (area: { minPercent: number; maxPercent: number } | null) => void;
      onPreviewWalkingArea?: (callback: (area: { minPercent: number; maxPercent: number } | null) => void) => (() => void) | void;
    };
  }
}
