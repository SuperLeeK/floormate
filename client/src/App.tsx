import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import confetti from 'canvas-confetti';
import {
  UserProfile,
  RoomUser,
  MessagePayload,
  PokePayload,
  AppSettings,
  UserStatus,
  CharacterType,
  ChatHistoryItem,
} from './types';
import { PixelCharacter } from './components/PixelCharacter';
import { SpeechBubble, BubbleMessageItem } from './components/SpeechBubble';
import { generateRoomCode } from './components/SettingsView';
import { CHARACTER_THEMES } from './constants';
import './App.css';

const DEFAULT_SETTINGS: AppSettings = {
  serverUrl: import.meta.env.VITE_SERVER_URL || 'https://floormate.hoeng.site',
  roomId: '',
  roomName: '메인 로비',
  userId: `user_${Math.random().toString(36).substring(2, 9)}`,
  userName: '친구_' + Math.floor(100 + Math.random() * 900),
  userAvatar: 'cat',
  dockSide: 'right',
  soundEnabled: true,
  maxBubbleCount: 2,
  bubbleDurationSec: 6,
  nameTagPosition: 'top', // 캐릭터 머리 바로 위 기본
  nameTagSpacing: 4,
  walkingArea: { minPercent: 0, maxPercent: 100 },
  recentRooms: [],
  bots: [
    {
      id: 'bot_dev_1',
      name: '루키봇',
      avatar: 'cat',
      messages: [
        '커피 한잔하고 왔어요 ☕',
        '오늘도 화이팅입니다! 🔥',
        '버그 잡는 중... 💻',
        '다들 맛점하세요 🥪',
        '집중 작업 모드 ON 🚀'
      ],
      typingDelaySec: 2,
      intervalSec: 15,
      enabled: false
    }
  ]
};

function getSavedSettings(): AppSettings {
  const saved = localStorage.getItem('dopamine_sidey_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.roomId || parsed.roomId === 'lobby') {
        parsed.roomId = generateRoomCode();
      }
      if (!parsed.roomName) {
        parsed.roomName = '메인 로비';
      }
      if (!parsed.nameTagPosition) {
        parsed.nameTagPosition = 'top';
      }
      if (typeof parsed.nameTagSpacing !== 'number') {
        parsed.nameTagSpacing = 4;
      }
      if (!parsed.walkingArea) {
        parsed.walkingArea = { minPercent: 0, maxPercent: 100 };
      }
      if (!Array.isArray(parsed.recentRooms) || (parsed.recentRooms.length > 0 && typeof parsed.recentRooms[0] === 'string')) {
        parsed.recentRooms = [{ code: parsed.roomId, name: parsed.roomName || '내 방' }];
      }
      if (!parsed.userAvatar || !CHARACTER_THEMES[parsed.userAvatar as CharacterType]) {
        parsed.userAvatar = 'cat';
      }
      if (Array.isArray(parsed.bots)) {
        parsed.bots = parsed.bots.map((b: any) => ({
          ...b,
          avatar: (!b.avatar || !CHARACTER_THEMES[b.avatar as CharacterType]) ? 'cat' : b.avatar,
        }));
      }
      if (!parsed.serverUrl || parsed.serverUrl.includes('localhost') || parsed.serverUrl.includes('trycloudflare.com')) {
        parsed.serverUrl = 'https://floormate.hoeng.site';
      }
      if (import.meta.env.VITE_SERVER_URL) {
        parsed.serverUrl = import.meta.env.VITE_SERVER_URL;
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      // fallback
    }
  }
  const initialCode = generateRoomCode();
  const initial = {
    ...DEFAULT_SETTINGS,
    roomId: initialCode,
    roomName: '내 방',
    recentRooms: [{ code: initialCode, name: '내 방' }]
  };
  return initial;
}

// 3일간 대화 기록 로컬 저장 함수 (72시간 경과 자동 삭제)
function saveToLocalHistory(item: ChatHistoryItem) {
  try {
    const saved = localStorage.getItem('floormate_chat_history');
    const list: ChatHistoryItem[] = saved ? JSON.parse(saved) : [];
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const cleanList = list.filter((m) => m.timestamp >= threeDaysAgo);
    cleanList.push(item);
    localStorage.setItem('floormate_chat_history', JSON.stringify(cleanList.slice(-300)));
  } catch {
    // ignore
  }
}

interface PetMotion {
  x: number;
  y: number; // 바닥에서의 높이 (0 = 바닥 밀착)
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  action: 'walking' | 'idle' | 'sitting' | 'dragging' | 'flung';
  actionTimer: number;
}

interface StoredBubbleItem extends BubbleMessageItem {
  createdAt: number;
}

interface FlyingStone {
  id: string;
  targetUserId: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  duration: number;
}

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(getSavedSettings);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [status, setStatus] = useState<UserStatus>('online');

  // 캐릭터 자율 보행 위치 상태: userId -> PetMotion
  const [petMotions, setPetMotions] = useState<Record<string, PetMotion>>({});

  // 캐릭터별 다중 말풍선 스택: userId -> StoredBubbleItem[]
  const [activeBubbles, setActiveBubbles] = useState<Record<string, StoredBubbleItem[]>>({});

  // 타이핑 중인 유저: userId -> boolean
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  // 찌르기/타격 상태: userId -> { type: string, timestamp: number }
  const [pokedUsers, setPokedUsers] = useState<Record<string, { type: string; timestamp: number }>>({});

  // 돌멩이 명중 이펙트(💥) 유저: userId -> boolean
  const [stoneHitUsers, setStoneHitUsers] = useState<Record<string, boolean>>({});

  // 비행 중인 폭탄 목록
  const [flyingStones, setFlyingStones] = useState<FlyingStone[]>([]);

  // 내 캐릭터 10배 거대화 상태
  const [isMegaGrowing, setIsMegaGrowing] = useState(false);

  // 실제 모니터 바닥 산책 가이드라인 실시간 미리보기 상태
  const [previewArea, setPreviewArea] = useState<{ minPercent: number; maxPercent: number } | null>(null);

  // 드래그 vs 클릭 구분용 ref (드래그 후 뗐을 때 투척 발동 방지)
  const wasDraggedRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 드래그 중인 펫 정보
  const dragRef = useRef<{
    userId: string;
    startMouseX: number;
    startMouseY: number;
    startPetX: number;
    startPetY: number;
    lastMouseX: number;
    lastMouseY: number;
    lastTime: number;
    vx: number;
    vy: number;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const lastSentMsgRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  const settingsRef = useRef<AppSettings>(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // -------------------------------------------------------------
  // 💬 말풍선 메시지 공통 등록 및 3일 로컬 기록
  // -------------------------------------------------------------
  const handleReceiveMessage = useCallback((msg: MessagePayload) => {
    const currentConfig = settingsRef.current;
    const maxCount = currentConfig.maxBubbleCount || 2;
    const durationMs = (currentConfig.bubbleDurationSec || 6) * 1000;
    const fadeStartMs = Math.max(durationMs - 800, 1000);

    // 1. 3일 로컬 대화 기록에 저장
    saveToLocalHistory({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: (msg.senderAvatar as CharacterType) || 'cat',
      text: msg.text,
      timestamp: msg.timestamp || Date.now(),
      isMe: msg.senderId === currentConfig.userId,
    });

    const newItem: StoredBubbleItem = {
      id: msg.id,
      senderName: msg.senderName,
      text: msg.text,
      createdAt: Date.now(),
      isFadingOut: false,
    };

    setTypingUsers((prev) => ({
      ...prev,
      [msg.senderId]: false,
    }));

    setActiveBubbles((prev) => {
      const list = prev[msg.senderId] || [];
      if (list.some((item) => item.id === msg.id)) {
        return prev;
      }
      const updated = [...list, newItem].slice(-maxCount);
      return {
        ...prev,
        [msg.senderId]: updated,
      };
    });

    setTimeout(() => {
      setActiveBubbles((prev) => {
        const list = prev[msg.senderId];
        if (!list) return prev;
        return {
          ...prev,
          [msg.senderId]: list.map((item) =>
            item.id === msg.id ? { ...item, isFadingOut: true } : item
          ),
        };
      });
    }, fadeStartMs);

    setTimeout(() => {
      setActiveBubbles((prev) => {
        const list = prev[msg.senderId];
        if (!list) return prev;
        const filtered = list.filter((item) => item.id !== msg.id);
        if (filtered.length === 0) {
          const next = { ...prev };
          delete next[msg.senderId];
          return next;
        }
        return {
          ...prev,
          [msg.senderId]: filtered,
        };
      });
    }, durationMs);
  }, []);

  // -------------------------------------------------------------
  // 🔌 소켓 연결 및 이벤트
  // -------------------------------------------------------------
  const connectSocket = useCallback((currentSettings: AppSettings, currentStatus: UserStatus) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(currentSettings.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      const myProfile: Omit<UserProfile, 'joinedAt'> = {
        id: currentSettings.userId,
        name: currentSettings.userName,
        avatar: currentSettings.userAvatar,
        status: currentStatus,
      };
      socket.emit('join_room', {
        roomId: currentSettings.roomId,
        user: myProfile,
      });
    });

    socket.on('room_users', (data: { roomId: string; users: RoomUser[] }) => {
      setUsers(data.users);
    });

    socket.on('user_joined', (data: { user: RoomUser }) => {
      setUsers((prev) => {
        const filtered = prev.filter((u) => u.id !== data.user.id);
        return [...filtered, data.user];
      });
    });

    socket.on('user_updated', (data: { user: RoomUser }) => {
      setUsers((prev) =>
        prev.map((u) => (u.id === data.user.id ? data.user : u))
      );
    });

    socket.on('user_left', (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
      if (data.userId !== currentSettings.userId) {
        setPetMotions((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
      setActiveBubbles((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    });

    socket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.userId]: Boolean(data.isTyping),
      }));
    });

    socket.on('new_message', (msg: MessagePayload) => {
      handleReceiveMessage(msg);
    });

    // 찌르기 및 돌멩이 피격 수신
    socket.on('user_poked', (poke: PokePayload) => {
      setPokedUsers((prev) => ({
        ...prev,
        [poke.targetUserId]: { type: poke.pokeType, timestamp: Date.now() },
      }));

      // 돌멩이에 맞았을 때 💥 이펙트
      if (poke.pokeType === 'stone') {
        setStoneHitUsers((prev) => ({ ...prev, [poke.targetUserId]: true }));
        setTimeout(() => {
          setStoneHitUsers((prev) => {
            const next = { ...prev };
            delete next[poke.targetUserId];
            return next;
          });
        }, 600);
      }

      if (poke.targetUserId === currentSettings.userId) {
        recordActivity();
        confetti({
          particleCount: poke.pokeType === 'stone' ? 15 : 25,
          spread: 45,
          origin: { y: 0.9 },
          colors: poke.pokeType === 'stone' ? ['#ff4757', '#ffa502', '#ced6e0'] : ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3'],
        });
      }

      setTimeout(() => {
        setPokedUsers((prev) => {
          const next = { ...prev };
          delete next[poke.targetUserId];
          return next;
        });
      }, 1500);
    });

    socketRef.current = socket;
  }, [handleReceiveMessage]);

  // -------------------------------------------------------------
  // ⚡ 자동 상태 관리 엔진 (5분 활성 / 5분 이상 미활동 시 취침)
  // -------------------------------------------------------------
  const lastActiveTimeRef = useRef<number>(Date.now());

  const recordActivity = useCallback(() => {
    lastActiveTimeRef.current = Date.now();
    if (status !== 'online') {
      setStatus('online');
      socketRef.current?.emit('update_status', { status: 'online' });
      window.electronAPI?.updateTrayStatus?.('online');
    }
  }, [status]);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActiveTimeRef.current;
      if (elapsed >= 5 * 60 * 1000) {
        if (status === 'online') {
          setStatus('sleep');
          socketRef.current?.emit('update_status', { status: 'sleep' });
          window.electronAPI?.updateTrayStatus?.('sleep');
        }
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [status]);

  useEffect(() => {
    const handleInput = () => recordActivity();
    window.addEventListener('mousemove', handleInput);
    window.addEventListener('keydown', handleInput);
    window.addEventListener('mousedown', handleInput);
    return () => {
      window.removeEventListener('mousemove', handleInput);
      window.removeEventListener('keydown', handleInput);
      window.removeEventListener('mousedown', handleInput);
    };
  }, [recordActivity]);

  // -------------------------------------------------------------
  // 📨 IPC 리스너 등록
  // -------------------------------------------------------------
  useEffect(() => {
    const unsubChat = window.electronAPI?.onReceiveChatMessage((text: string) => {
      const clean = text?.trim();
      if (!clean) return;

      const now = Date.now();
      if (lastSentMsgRef.current.text === clean && now - lastSentMsgRef.current.time < 800) {
        return;
      }
      lastSentMsgRef.current = { text: clean, time: now };

      recordActivity();
      setTypingUsers((prev) => ({ ...prev, [settingsRef.current.userId]: false }));
      socketRef.current?.emit('typing', { isTyping: false });
      socketRef.current?.emit('send_message', { text: clean });
    });

    const unsubTyping = window.electronAPI?.onChatTyping((isTyping: boolean) => {
      const myId = settingsRef.current.userId;
      setTypingUsers((prev) => ({ ...prev, [myId]: isTyping }));
      socketRef.current?.emit('typing', { isTyping });
      if (isTyping) {
        recordActivity();
      }
    });

    const unsubSettings = window.electronAPI?.onSettingsUpdated((newSettings: AppSettings) => {
      const oldSettings = settingsRef.current;
      const isConnectionChanged =
        oldSettings.serverUrl !== newSettings.serverUrl ||
        oldSettings.roomId !== newSettings.roomId;

      setSettings(newSettings);
      localStorage.setItem('dopamine_sidey_settings', JSON.stringify(newSettings));

      // 내 아바타 / 이름 변경 시 화면에 즉시 반영
      setUsers((prev) =>
        prev.map((u) =>
          u.id === newSettings.userId
            ? { ...u, name: newSettings.userName, avatar: newSettings.userAvatar }
            : u
        )
      );

      if (isConnectionChanged) {
        connectSocket(newSettings, status);
      } else {
        socketRef.current?.emit('update_status', {
          name: newSettings.userName,
          avatar: newSettings.userAvatar,
        });
      }
    });

    const unsubTray = window.electronAPI?.onStatusChangedFromTray((newStatus: UserStatus) => {
      setStatus(newStatus);
      socketRef.current?.emit('update_status', { status: newStatus });
      window.electronAPI?.updateTrayStatus?.(newStatus);
    });

    const unsubPreviewArea = window.electronAPI?.onPreviewWalkingArea?.((area) => {
      setPreviewArea(area);
    });

    return () => {
      if (typeof unsubChat === 'function') unsubChat();
      if (typeof unsubTyping === 'function') unsubTyping();
      if (typeof unsubSettings === 'function') unsubSettings();
      if (typeof unsubTray === 'function') unsubTray();
      if (typeof unsubPreviewArea === 'function') unsubPreviewArea();
    };
  }, [connectSocket, status, recordActivity]);

  useEffect(() => {
    connectSocket(settings, status);
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // -------------------------------------------------------------
  // 💣 상대방 클릭 시: 실시간 포물선 폭탄 투척 물리 엔진
  // -------------------------------------------------------------
  const throwStoneToUser = (targetUserId: string) => {
    recordActivity();
    const myId = settings.userId;
    const myMotion = petMotions[myId] || { x: 100, y: 0 };
    const targetMotion = petMotions[targetUserId] || { x: 300, y: 0 };

    const startX = myMotion.x + 32;
    const startY = 36; // 내 캐릭터 가슴/손 높이 (바닥 기준)
    const targetX = targetMotion.x + 32;
    const targetY = 36; // 상대방 높이 (바닥 기준)

    const stoneId = `bomb_${Date.now()}_${Math.random()}`;
    const newStone: FlyingStone = {
      id: stoneId,
      targetUserId,
      startX,
      startY,
      targetX,
      targetY,
      currentX: startX,
      currentY: startY,
      startTime: performance.now(),
      duration: 480, // 0.48초 동안 곡선 아치 비행
    };

    setFlyingStones((prev) => [...prev, newStone]);
  };

  // 포물선 폭탄 실시간 프레임 애니메이션 루프
  useEffect(() => {
    if (flyingStones.length === 0) return;
    let animId: number;

    const animateProjectiles = (now: number) => {
      setFlyingStones((prev) => {
        const remaining: FlyingStone[] = [];

        prev.forEach((stone) => {
          const elapsed = now - stone.startTime;
          const p = Math.min(1, elapsed / stone.duration);

          if (p < 1) {
            // 높은 곡선 아치 (sin 곡선: 0 -> 1 -> 0, 최대 160px 위로 솟구침)
            const arcHeight = Math.sin(p * Math.PI) * 160;
            const currentX = stone.startX + (stone.targetX - stone.startX) * p;
            const currentY = stone.startY + (stone.targetY - stone.startY) * p + arcHeight;

            remaining.push({
              ...stone,
              currentX,
              currentY,
            });
          } else {
            // 💥 상대방 머리에 명중하는 순간 폭발 이펙트 & 피격 모션 발동!
            const targetId = stone.targetUserId;
            setStoneHitUsers((prevHits) => ({ ...prevHits, [targetId]: true }));
            setPokedUsers((prevPokes) => ({
              ...prevPokes,
              [targetId]: { type: 'stone', timestamp: Date.now() },
            }));

            setTimeout(() => {
              setStoneHitUsers((prevHits) => {
                const next = { ...prevHits };
                delete next[targetId];
                return next;
              });
              setPokedUsers((prevPokes) => {
                const next = { ...prevPokes };
                delete next[targetId];
                return next;
              });
            }, 700);

            // 소켓 전송 (친구인 경우)
            if (!targetId.startsWith('bot_')) {
              socketRef.current?.emit('send_poke', {
                targetUserId: targetId,
                pokeType: 'stone',
              });
            }
          }
        });

        return remaining;
      });

      animId = requestAnimationFrame(animateProjectiles);
    };

    animId = requestAnimationFrame(animateProjectiles);
    return () => cancelAnimationFrame(animId);
  }, [flyingStones.length]);

  // -------------------------------------------------------------
  // 🦖 내 캐릭터 더블클릭 시: 10배 거대화
  // -------------------------------------------------------------
  const handleMyPetDoubleClick = () => {
    recordActivity();
    setIsMegaGrowing(true);
    setTimeout(() => {
      setIsMegaGrowing(false);
    }, 1200);
  };

  // -------------------------------------------------------------
  // 🤾 상대방 캐릭터 마우스 드래그 & 던지기 (물리 엔진)
  // -------------------------------------------------------------
  const handlePetMouseDown = (e: React.MouseEvent, user: RoomUser) => {
    if (user.id === settings.userId) return; // 내 캐릭터는 드래그 대신 더블클릭 거대화
    e.preventDefault();
    recordActivity();

    // 드래그 거리 판정 초기화
    wasDraggedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };

    const currentMotion = petMotions[user.id] || { x: 100, y: 0 };
    dragRef.current = {
      userId: user.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPetX: currentMotion.x,
      startPetY: currentMotion.y || 0,
      lastMouseX: e.clientX,
      lastMouseY: e.clientY,
      lastTime: performance.now(),
      vx: 0,
      vy: 0,
    };

    setPetMotions((prev) => ({
      ...prev,
      [user.id]: {
        ...prev[user.id],
        action: 'dragging',
      },
    }));
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const drag = dragRef.current;
      const now = performance.now();
      const dt = Math.max((now - drag.lastTime) / 1000, 0.016);

      const dx = e.clientX - drag.startMouseX;
      // 화면 좌표계는 y가 아래로 갈수록 커지므로 반전
      const dy = drag.startMouseY - e.clientY;

      // 마우스 이동 거리 판정 (6px 이상 움직였으면 드래그로 판정 -> 클릭 무시)
      const dist = Math.hypot(e.clientX - dragStartPosRef.current.x, e.clientY - dragStartPosRef.current.y);
      if (dist > 6) {
        wasDraggedRef.current = true;
      }

      // 마우스 속도 계산 (던지는 관성용)
      drag.vx = (e.clientX - drag.lastMouseX) / dt;
      drag.vy = (drag.lastMouseY - e.clientY) / dt;
      drag.lastMouseX = e.clientX;
      drag.lastMouseY = e.clientY;
      drag.lastTime = now;

      const newX = drag.startPetX + dx;
      const newY = Math.max(0, drag.startPetY + dy);

      setPetMotions((prev) => ({
        ...prev,
        [drag.userId]: {
          ...(prev[drag.userId] || { vx: 0, facing: 'right', actionTimer: 0 }),
          x: newX,
          y: newY,
          action: 'dragging',
        },
      }));
    };

    const handleGlobalMouseUp = () => {
      if (!dragRef.current) return;
      const drag = dragRef.current;
      const flungVx = Math.min(Math.max(drag.vx * 0.7, -600), 600);
      const flungVy = Math.min(Math.max(drag.vy * 0.7, 100), 800);

      if (wasDraggedRef.current) {
        // 실제로 마우스를 끌어 던진 상태로 전이
        setPetMotions((prev) => ({
          ...prev,
          [drag.userId]: {
            ...(prev[drag.userId] || { x: 100, y: 0, facing: 'right', actionTimer: 0 }),
            vx: flungVx,
            vy: flungVy,
            action: 'flung',
            actionTimer: 4000,
          },
        }));
      } else {
        // 거의 움직이지 않았으면 제자리 복귀
        setPetMotions((prev) => ({
          ...prev,
          [drag.userId]: {
            ...(prev[drag.userId] || { x: 100, y: 0, facing: 'right', actionTimer: 0 }),
            action: 'idle',
          },
        }));
      }

      dragRef.current = null;
      window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // -------------------------------------------------------------
  // 🤖 DEV 환경 봇 시뮬레이터 (자율 대화 루프)
  // -------------------------------------------------------------
  const activeBots: RoomUser[] = useMemo(() => {
    if (!import.meta.env.DEV || !settings.bots) return [];
    return settings.bots
      .filter((b) => b.enabled)
      .map((b) => ({
        id: b.id,
        name: b.name,
        avatar: b.avatar,
        status: 'online' as const,
        socketId: 'bot_' + b.id,
      }));
  }, [settings.bots]);

  useEffect(() => {
    if (!import.meta.env.DEV || !settings.bots) return;
    const enabledBots = settings.bots.filter((b) => b.enabled && b.messages.length > 0);
    if (enabledBots.length === 0) return;

    const timeouts: NodeJS.Timeout[] = [];

    enabledBots.forEach((bot) => {
      const intervalMs = (bot.intervalSec || 15) * 1000;
      const typingMs = (bot.typingDelaySec || 2) * 1000;

      const scheduleNext = () => {
        const nextDelay = intervalMs + (Math.random() * 4000 - 2000);
        const timer = setTimeout(() => {
          setTypingUsers((prev) => ({ ...prev, [bot.id]: true }));

          const postTimer = setTimeout(() => {
            setTypingUsers((prev) => ({ ...prev, [bot.id]: false }));
            const randomMsg = bot.messages[Math.floor(Math.random() * bot.messages.length)];
            if (randomMsg) {
              handleReceiveMessage({
                id: `bot_msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                senderId: bot.id,
                senderName: bot.name,
                senderAvatar: bot.avatar,
                text: randomMsg,
                timestamp: Date.now(),
              });
            }
            scheduleNext();
          }, typingMs);

          timeouts.push(postTimer);
        }, Math.max(3000, nextDelay));

        timeouts.push(timer);
      };

      scheduleNext();
    });

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [settings.bots, handleReceiveMessage]);

  const allUsersToRender: RoomUser[] = useMemo(() => {
    const hasMe = users.some((u) => u.id === settings.userId);
    let base = users;
    if (!hasMe) {
      const myMock: RoomUser = {
        id: settings.userId,
        name: settings.userName,
        avatar: settings.userAvatar,
        status: status,
        socketId: 'local',
      };
      base = [myMock, ...users];
    }
    return [...base, ...activeBots];
  }, [users, settings.userId, settings.userName, settings.userAvatar, status, activeBots]);

  // -------------------------------------------------------------
  // 🐾 자율 보행 및 물리 투척 중력 엔진 (바닥 0px 밀착!)
  // -------------------------------------------------------------
  useEffect(() => {
    const screenWidth = window.innerWidth || 1200;
    const area = settings.walkingArea || { minPercent: 0, maxPercent: 100 };
    const areaMin = Math.round(screenWidth * (Math.max(0, area.minPercent) / 100));
    const areaMax = Math.round(screenWidth * (Math.min(100, area.maxPercent) / 100));
    const minX = Math.max(10, areaMin + 10);
    const maxX = Math.max(minX + 80, areaMax - 70);

    const updateMotions = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      setPetMotions((prevMotions) => {
        const next: Record<string, PetMotion> = { ...prevMotions };

        allUsersToRender.forEach((user, index) => {
          let motion = next[user.id];

          if (!motion) {
            const initialX = Math.min(
              maxX,
              Math.max(minX, minX + index * 90 + Math.random() * 40)
            );
            const speed = 35 + Math.random() * 25;
            const dir = Math.random() > 0.5 ? 'right' : 'left';
            motion = {
              x: initialX,
              y: 0, // 바닥에 0px 밀착
              vx: dir === 'right' ? speed : -speed,
              vy: 0,
              facing: dir,
              action: 'walking',
              actionTimer: 3000 + Math.random() * 4000,
            };
          }

          // 마우스 드래그 중인 캐릭터는 물리 엔진 패스
          if (motion.action === 'dragging') {
            return;
          }

          // 던져진 캐릭터(flung) 물리 중력 시뮬레이션
          if (motion.action === 'flung') {
            const gravity = -1200; // 아래로 떨어지는 중력
            const newVy = motion.vy + gravity * dt;
            let newY = (motion.y || 0) + newVy * dt;
            let newX = motion.x + motion.vx * dt;
            let nextAction: PetMotion['action'] = 'flung';
            let nextVy = newVy;
            let nextVx = motion.vx;

            // 벽 충돌
            if (newX <= minX) {
              newX = minX;
              nextVx = -nextVx * 0.5;
            } else if (newX >= maxX) {
              newX = maxX;
              nextVx = -nextVx * 0.5;
            }

            // 바닥 착지 (y <= 0)
            if (newY <= 0) {
              newY = 0;
              if (Math.abs(nextVy) > 150) {
                // 바운스
                nextVy = -nextVy * 0.35;
                nextVx = nextVx * 0.7;
              } else {
                // 착지 완료 -> 잠시 앉아 쉬다가 걷기 복귀
                nextVy = 0;
                nextAction = 'sitting';
              }
            }

            next[user.id] = {
              ...motion,
              x: newX,
              y: newY,
              vx: nextVx,
              vy: nextVy,
              action: nextAction,
              actionTimer: 2500,
            };
            return;
          }

          if (user.status === 'sleep' || user.status === 'busy') {
            next[user.id] = {
              ...motion,
              y: 0,
              action: 'sitting',
              actionTimer: 5000,
            };
            return;
          }

          let timer = motion.actionTimer - dt * 1000;
          let action = motion.action;
          let vx = motion.vx;
          let facing = motion.facing;

          if (timer <= 0) {
            const rand = Math.random();
            if (rand < 0.65) {
              action = 'walking';
              const speed = 35 + Math.random() * 30;
              const newDir = Math.random() > 0.5 ? 'right' : 'left';
              facing = newDir;
              vx = newDir === 'right' ? speed : -speed;
              timer = 3000 + Math.random() * 5000;
            } else if (rand < 0.85) {
              action = 'idle';
              vx = 0;
              timer = 2000 + Math.random() * 3000;
            } else {
              action = 'sitting';
              vx = 0;
              timer = 3000 + Math.random() * 4000;
            }
          }

          let newX = motion.x;
          if (action === 'walking') {
            newX += vx * dt;
            if (newX <= minX) {
              newX = minX;
              vx = Math.abs(vx);
              facing = 'right';
            } else if (newX >= maxX) {
              newX = maxX;
              vx = -Math.abs(vx);
              facing = 'left';
            }
          } else {
            if (newX < minX) newX = minX;
            if (newX > maxX) newX = maxX;
          }

          next[user.id] = {
            ...motion,
            x: newX,
            y: 0, // 바닥 0px 고정 밀착
            vx,
            facing,
            action,
            actionTimer: timer,
          };
        });

        return next;
      });

      animFrameRef.current = requestAnimationFrame(updateMotions);
    };

    animFrameRef.current = requestAnimationFrame(updateMotions);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [allUsersToRender, settings.walkingArea]);

  const nameTagPos = settings.nameTagPosition || 'top';
  const nameTagSpacing = settings.nameTagSpacing ?? 4;

  return (
    <div className="pure-overlay-app">
      <div className="bottom-walking-stage">
        {/* ========================================================= */}
        {/* 🌟 실제 PC 모니터 바닥에 직접 투사되는 실시간 네온 산책 가이드라인! */}
        {/* ========================================================= */}
        {previewArea && (
          <div
            className="desktop-walking-guide-beam"
            style={{
              left: `${previewArea.minPercent}%`,
              width: `${Math.max(5, previewArea.maxPercent - previewArea.minPercent)}%`,
            }}
          >
            <div className="guide-beam-floor-line" />
            <div className="guide-beam-glow" />
            <div className="guide-beam-marker left-marker">
              <span className="marker-pin">▼</span>
              <span className="marker-val">{previewArea.minPercent}%</span>
            </div>
            <div className="guide-beam-center-tag">
              <span>🐾 FloorMate 산책 활동 구간</span>
            </div>
            <div className="guide-beam-marker right-marker">
              <span className="marker-pin">▼</span>
              <span className="marker-val">{previewArea.maxPercent}%</span>
            </div>
          </div>
        )}

        {/* 날아가는 포물선 투척 아이템 렌더링 */}
        {flyingStones.map((stone) => {
          const throwEmoji = settings.throwItem === 'stone' ? '🪨'
            : settings.throwItem === 'heart' ? '💖'
            : settings.throwItem === 'lightning' ? '⚡'
            : settings.throwItem === 'star' ? '⭐'
            : settings.throwItem === 'waterball' ? '🎈'
            : '💣';
          return (
            <div
              key={stone.id}
              className="flying-bomb-projectile"
              style={{
                left: `${stone.currentX}px`,
                bottom: `${stone.currentY}px`,
              }}
            >
              {throwEmoji}
            </div>
          );
        })}

        {allUsersToRender.map((user) => {
          const isMe = user.id === settings.userId;
          const motion = petMotions[user.id] || {
            x: 100,
            y: 0,
            vx: 0,
            facing: 'right' as const,
            action: 'idle' as const,
            actionTimer: 0,
          };
          const bubbleList = activeBubbles[user.id] || [];
          const isTyping = Boolean(typingUsers[user.id]);
          const pokeInfo = pokedUsers[user.id];
          const isStoneHit = Boolean(stoneHitUsers[user.id]);
          const isWalking = motion.action === 'walking';
          const isDragging = motion.action === 'dragging';

          // 말풍선 수직 위치: 머리 위 앵커 (메시지가 몇 개 쌓이든 캐릭터는 바닥 0px 불변 고정!)
          const bubbleAnchorBottom = nameTagPos === 'top'
            ? 58 + nameTagSpacing + 24
            : 62;

          const hitEffectEmoji = settings.throwItem === 'stone' ? '💫'
            : settings.throwItem === 'heart' ? '💕'
            : settings.throwItem === 'lightning' ? '⚡'
            : settings.throwItem === 'star' ? '✨'
            : settings.throwItem === 'waterball' ? '💦'
            : '💥';

          return (
            <div
              key={user.id}
              className={`roaming-pet-container ${isMe ? 'is-me' : 'is-friend'} ${isDragging ? 'is-dragging' : ''}`}
              style={{
                left: `${motion.x}px`,
                bottom: `${motion.y || 0}px`, // 바닥 0px 칼밀착
              }}
              onMouseEnter={() => {
                window.electronAPI?.setIgnoreMouseEvents(false);
              }}
              onMouseLeave={() => {
                if (!dragRef.current) {
                  window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
                }
              }}
              onMouseDown={(e) => {
                handlePetMouseDown(e, user);
              }}
              onClick={() => {
                recordActivity();
                window.electronAPI?.setIgnoreMouseEvents(false);
                if (isMe) {
                  // 내 캐릭터 단순 클릭 시 채팅창 열던 동작 완전 제거 (더블클릭 거대화만 전담)
                  return;
                }
                // 마우스 드래그로 던진 직후의 클릭 이벤트는 무시!
                if (wasDraggedRef.current) {
                  wasDraggedRef.current = false;
                  return;
                }
                // 순수 클릭일 때만 상대방에게 포물선 폭탄 투척!
                throwStoneToUser(user.id);
              }}
              onDoubleClick={() => {
                if (isMe) {
                  handleMyPetDoubleClick();
                }
              }}
            >
              {/* 투척 피격 이펙트 */}
              {isStoneHit && <div className="stone-hit-burst">{hitEffectEmoji}</div>}

              {/* 말풍선 레이어: 캐릭터 위쪽 앵커 (절대 분리되어 캐릭터의 바닥 위치를 전혀 밀지 않음) */}
              {(bubbleList.length > 0 || isTyping) && (
                <div
                  className="speech-bubble-anchor"
                  style={{
                    position: 'absolute',
                    bottom: `${bubbleAnchorBottom}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    zIndex: 250,
                  }}
                >
                  <SpeechBubble
                    messages={bubbleList}
                    isTyping={isTyping}
                    theme={isMe ? (settings.bubbleTheme || 'default') : 'default'}
                  />
                </div>
              )}

              {/* 이름표가 '머리 위'일 때 (🟢 닉네임 · 나) */}
              {nameTagPos === 'top' && (
                <div
                  className={`pet-nametag ${isMe ? 'is-me-tag' : ''}`}
                  style={{
                    position: 'absolute',
                    bottom: `${58 + nameTagSpacing}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 150,
                  }}
                >
                  <span className={`nametag-dot ${user.status === 'sleep' ? 'sleep' : 'green'}`} />
                  <span>{isMe ? `${user.name} · 나` : user.name}</span>
                </div>
              )}

              {/* 픽셀 동물 캐릭터 (바닥 0px에 칼밀착!) */}
              <div className={`pet-character-wrapper ${isMe && isMegaGrowing ? 'is-mega-grow' : ''}`}>
                <PixelCharacter
                  type={user.avatar as CharacterType}
                  status={user.status}
                  isWalking={isWalking}
                  facingDirection={motion.facing}
                  isPoked={Boolean(pokeInfo)}
                  pokeEffect={pokeInfo?.type || null}
                  size={64}
                />
              </div>

              {/* 이름표가 '발 아래'일 때: 캐릭터 앞쪽 하단에 뱃지로 안착 (바닥 0px 밀착 유지!) */}
              {nameTagPos === 'bottom' && (
                <div
                  className={`pet-nametag is-bottom-tag ${isMe ? 'is-me-tag' : ''}`}
                  style={{
                    position: 'absolute',
                    bottom: '0px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 150,
                  }}
                >
                  <span className={`nametag-dot ${user.status === 'sleep' ? 'sleep' : 'green'}`} />
                  <span>{isMe ? `${user.name} · 나` : user.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
