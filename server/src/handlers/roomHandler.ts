import { Server, Socket } from 'socket.io';
import prisma from '../utils/prisma';
import bcrypt from 'bcryptjs';
import RoomManager from '../utils/roomManager';

// Generar código de sala aleatorio
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

export const roomHandler = (io: Server, socket: Socket, roomManager: RoomManager) => {

    // Get userId from handshake auth or query
    const userId = (socket.handshake.auth.userId as string) || (socket.handshake.query.userId as string) || socket.id;

    console.log(`[Connection] Socket ${socket.id} connected. Auth UserId: ${socket.handshake.auth.userId}, Query UserId: ${socket.handshake.query.userId}, Final UserId: ${userId}`);

    const createRoom = async (payload: { password?: string }) => {
        try {
            const { password } = payload;
            if (!password) {
                socket.emit('error', { message: 'Password is required' });
                return;
            }

            const code = generateRoomCode();
            const hashedPassword = await bcrypt.hash(password, 10);

            //guardar en la base de datos
            const room = await prisma.room.create({
                data: {
                    code,
                    password: hashedPassword,
                },
            });

            // Initialize in RoomManager
            roomManager.createRoom(room.code, userId, socket.id);

            socket.join(room.code);
            socket.emit('room:created', { roomId: room.id, code: room.code });

            // Also update role
            socket.emit('room:role_update', { isHost: true });

            console.log(`Sala creada: ${room.code} por ${userId} (${socket.id})`);
        } catch (error) {
            console.error('Error creando sala:', error);
            socket.emit('error', { message: 'Error creating room' });
        }
    };

    const joinRoom = async (payload: { code: string; password?: string }) => {
        try {
            const { code, password } = payload;

            const roomDB = await prisma.room.findUnique({
                where: { code },
            });

            if (!roomDB) {
                socket.emit('error', { message: 'Room not found' });
                return;
            }

            if (password) {
                const isValid = await bcrypt.compare(password, roomDB.password);
                if (!isValid) {
                    socket.emit('error', { message: 'Invalid password' });
                    return;
                }
            } else {
                socket.emit('error', { message: 'Password required' });
                return;
            }

            // Join via RoomManager
            const roomState = roomManager.joinRoom(roomDB.code, userId, socket.id);
            if (!roomState) {
                // Should not happen if DB exists but RoomManager cleaned it up?
                // If RoomManager cleaned it up, we might need to recreate it from DB state?
                // But RoomManager holds volatile state (timer).
                // For now, if DB exists but RoomManager doesn't, we recreate it "empty" or maybe just Create it via RoomManager with this user as host if empty?
                // Or treat as new session.
                // Let's assume valid case is: if not in RoomManager, we create it?
                // But if we create it, who is host?
                // Let's create it if missing (e.g. server restart).
                // But we don't know who was host.
                // We can make this user host.
                roomManager.createRoom(roomDB.code, userId, socket.id);
            }

            socket.join(roomDB.code);

            const currentRoomState = roomManager.getRoom(roomDB.code);
            const isHost = currentRoomState?.hostUserId === userId;

            socket.emit('room:joined', {
                roomId: roomDB.id,
                code: roomDB.code,
                timerConfig: currentRoomState?.timer || roomDB.timerConfig
            });

            socket.emit('room:role_update', { isHost });

            // Sync timer immediately
            roomManager.syncTimer(roomDB.code, socket.id);

            // Sync user count immediately
            roomManager.emitUserCount(roomDB.code);

            console.log(`Usuario ${userId} unido a sala ${roomDB.code}`);

        } catch (error) {
            console.error('Error uniéndose a sala:', error);
            socket.emit('error', { message: 'Error joining room' });
        }
    };

    const getUsersCount = () => {
        // Find room for this socket?
        // RoomManager doesn't have reverse lookup easily exposed public, but we can iterate or store it.
        // Actually, let's just use the roomManager's internal knowledge if possible or just use the socket's joined rooms?
        // socket.rooms is a Set.

        // Better: RoomManager.getRoomBySocketId(socket.id)?
        // Or client sends roomCode? Client might not have it in state if just connecting... wait, client sends it in room:join.
        // But if client calls this, it should be in a room.

        // Let's iterate rooms in RoomManager for now, or just trust the client to have joined?
        // Client didn't send data.

        // Let's look up in roomManager
        for (const [roomId, room] of roomManager['rooms'].entries()) {
            if (room.users.has(userId) || Array.from(room.users.values()).some(u => u.socketId === socket.id)) {
                roomManager.emitUserCount(roomId);
                return;
            }
        }
    };

    socket.on('room:create', createRoom);
    socket.on('room:join', joinRoom);
    socket.on('room:get_users_count', getUsersCount);
};
