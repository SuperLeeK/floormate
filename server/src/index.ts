import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

export type UserStatus = 'online' | 'busy' | 'away' | 'sleep';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string; // e.g., 'cat', 'dog', 'rabbit', 'hamster', 'fox', 'bear'
  status: UserStatus;
  customMessage?: string;
  joinedAt: number;
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
  targetUserId?: string; // 특정 유저에게 귓속말 또는 전체(undefined)
  timestamp: number;
}

export interface PokePayload {
  id: string;
  senderId: string;
  senderName: string;
  targetUserId: string;
  pokeType: 'poke' | 'pat' | 'heart' | 'water' | 'snack';
  timestamp: number;
}

// 방별 유저 맵: roomId -> Map<socketId, RoomUser>
const rooms = new Map<string, Map<string, RoomUser>>();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    activeRooms: rooms.size,
    totalConnections: io.engine.clientsCount
  });
});

app.get('/', (_req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>✨ FloorMate Relay Server ✨</h1>
      <p>Server is running smoothly!</p>
      <p>Active rooms: ${rooms.size} | Total connections: ${io.engine.clientsCount}</p>
    </div>
  `);
});

io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let currentUser: RoomUser | null = null;

  // 1. 방 참가
  socket.on('join_room', (data: { roomId: string; user: Omit<UserProfile, 'joinedAt'> }) => {
    const { roomId, user } = data;
    if (!roomId || !user || !user.name) {
      socket.emit('error_message', { message: 'Invalid room or user info' });
      return;
    }

    currentRoomId = roomId;
    currentUser = {
      ...user,
      socketId: socket.id,
      joinedAt: Date.now()
    };

    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    const roomMap = rooms.get(roomId)!;
    roomMap.set(socket.id, currentUser);

    // 본인에게 방 유저 목록 전달
    const userList = Array.from(roomMap.values());
    socket.emit('room_users', { roomId, users: userList });

    // 방의 다른 사람들에게 입장 알림
    socket.to(roomId).emit('user_joined', { user: currentUser });

    console.log(`[Join] User ${currentUser.name}(${currentUser.id}) joined room: ${roomId}`);
  });

  // 2. 상태 변경 (온라인, 작업중, 자리비움, 잠자기 등)
  socket.on('update_status', (data: { status: UserStatus; customMessage?: string; avatar?: string; name?: string }) => {
    if (!currentRoomId || !currentUser) return;

    if (data.status) currentUser.status = data.status;
    if (data.customMessage !== undefined) currentUser.customMessage = data.customMessage;
    if (data.avatar) currentUser.avatar = data.avatar;
    if (data.name) currentUser.name = data.name;

    const roomMap = rooms.get(currentRoomId);
    if (roomMap) {
      roomMap.set(socket.id, currentUser);
    }

    io.to(currentRoomId).emit('user_updated', { user: currentUser });
  });

  // 3. 메시지(말풍선) 전송
  socket.on('send_message', (data: { text: string; targetUserId?: string }) => {
    if (!currentRoomId || !currentUser || !data.text?.trim()) return;

    const message: MessagePayload = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: data.text.trim().slice(0, 150), // 최대 150자 제한
      targetUserId: data.targetUserId,
      timestamp: Date.now()
    };

    io.to(currentRoomId).emit('new_message', message);
    console.log(`[Message] [${currentRoomId}] ${currentUser.name}: ${message.text}`);
  });

  // 4. 쿡 찌르기 (상호작용)
  socket.on('send_poke', (data: { targetUserId: string; pokeType: PokePayload['pokeType'] }) => {
    if (!currentRoomId || !currentUser || !data.targetUserId) return;

    const poke: PokePayload = {
      id: `poke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      targetUserId: data.targetUserId,
      pokeType: data.pokeType || 'poke',
      timestamp: Date.now()
    };

    io.to(currentRoomId).emit('user_poked', poke);
    console.log(`[Poke] [${currentRoomId}] ${currentUser.name} poked ${data.targetUserId} with ${poke.pokeType}`);
  });

  // 4-1. 입력 중 (Typing) 브로드캐스트
  socket.on('typing', (data: { isTyping: boolean }) => {
    if (!currentRoomId || !currentUser) return;
    socket.to(currentRoomId).emit('user_typing', {
      userId: currentUser.id,
      isTyping: Boolean(data.isTyping)
    });
  });

  // 5. 연결 종료 처리
  socket.on('disconnect', () => {
    if (currentRoomId && currentUser) {
      const roomMap = rooms.get(currentRoomId);
      if (roomMap) {
        roomMap.delete(socket.id);
        if (roomMap.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          socket.to(currentRoomId).emit('user_left', { userId: currentUser.id });
        }
      }
      console.log(`[Leave] User ${currentUser.name} left room: ${currentRoomId}`);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 FloorMate Relay Server listening on http://localhost:${PORT}`);
  console.log(`📡 WebSocket endpoint ready for local & ngrok tunneling`);
});
