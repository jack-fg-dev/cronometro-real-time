"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./prisma"));
const HOST_GRACE_PERIOD_MS = 20000; // 20 seconds grace period
class RoomManager {
    constructor(io) {
        this.rooms = new Map();
        this.io = io;
    }
    // Initialize or get room
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    createRoom(roomId, hostUserId, hostSocketId) {
        if (this.rooms.has(roomId))
            return;
        const initialTimer = {
            running: false,
            accumulatedTime: 0,
            startTime: null,
            type: 'stopwatch',
            initialTime: 0
        };
        const roomState = {
            roomId,
            users: new Map(),
            hostUserId,
            timer: initialTimer,
            disconnectTimeouts: new Map(),
            createdAt: Date.now()
        };
        // Add host immediately
        roomState.users.set(hostUserId, { userId: hostUserId, socketId: hostSocketId, joinedAt: Date.now() });
        this.rooms.set(roomId, roomState);
        console.log(`[RoomManager] Room ${roomId} created by ${hostUserId}`);
    }
    joinRoom(roomId, userId, socketId) {
        let room = this.rooms.get(roomId);
        if (!room) {
            // Should usually be created via createRoom, but handle rejoin/recover cases if persisted
            console.warn(`[RoomManager] Join attempt for non-existent room ${roomId}`);
            return null;
        }
        // Check if user was in grace period (disconnect timeout)
        if (room.disconnectTimeouts.has(userId)) {
            console.log(`[RoomManager] User ${userId} reconnected to room ${roomId}`);
            clearTimeout(room.disconnectTimeouts.get(userId));
            room.disconnectTimeouts.delete(userId);
            if (room.hostUserId === userId) {
                console.log(`[RoomManager] Host ${userId} reconnected. Restoring status.`);
                this.io.to(roomId).emit('room:host_reconnected');
            }
        }
        else {
            console.log(`[RoomManager] User ${userId} joined room ${roomId}`);
        }
        // Update user socket
        room.users.set(userId, {
            userId,
            socketId,
            joinedAt: room.users.get(userId)?.joinedAt || Date.now()
        });
        // If room has no host (e.g. everyone left and came back?), assign this user
        if (!room.hostUserId) {
            this.setHost(roomId, userId);
        }
        this.emitUserCount(roomId);
        return room;
    }
    leaveRoom(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        if (room.hostUserId === userId) {
            console.log(`[RoomManager] Host ${userId} disconnected from room ${roomId}. Starting grace period.`);
            const timeout = setTimeout(() => {
                this.handleHostPermanentDisconnect(roomId, userId);
            }, HOST_GRACE_PERIOD_MS);
            room.disconnectTimeouts.set(userId, timeout);
            this.io.to(roomId).emit('room:host_disconnected', { gracePeriod: HOST_GRACE_PERIOD_MS });
        }
        else {
            const timeout = setTimeout(() => {
                this.handleUserPermanentDisconnect(roomId, userId);
            }, 5000); // 5s for non-host to reconnect before full removal
            room.disconnectTimeouts.set(userId, timeout);
        }
    }
    handleHostPermanentDisconnect(roomId, oldHostId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        console.log(`[RoomManager] Grace period expired for host ${oldHostId} in room ${roomId}`);
        room.disconnectTimeouts.delete(oldHostId);
        room.users.delete(oldHostId); // Remove old host fully
        // Find new host (oldest user)
        if (room.users.size > 0) {
            // Sort by joinedAt
            const sortedUsers = Array.from(room.users.values()).sort((a, b) => a.joinedAt - b.joinedAt);
            const newHost = sortedUsers[0];
            this.setHost(roomId, newHost.userId);
        }
        else {
            console.log(`[RoomManager] Room ${roomId} empty. Deleting.`);
            this.deleteRoom(roomId);
        }
        this.emitUserCount(roomId);
    }
    handleUserPermanentDisconnect(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        room.disconnectTimeouts.delete(userId);
        room.users.delete(userId);
        this.emitUserCount(roomId);
        if (room.users.size === 0) {
            console.log(`[RoomManager] Room ${roomId} empty. Deleting.`);
            this.deleteRoom(roomId);
        }
    }
    setHost(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        room.hostUserId = userId;
        console.log(`[RoomManager] Room ${roomId} new host: ${userId}`);
        this.io.to(roomId).emit('room:host_changed', { hostUserId: userId });
        const socketId = room.users.get(userId)?.socketId;
        if (socketId) {
            this.io.to(socketId).emit('room:role_update', { isHost: true });
        }
    }
    async deleteRoom(roomId) {
        this.rooms.delete(roomId);
        console.log(`[RoomManager] Room ${roomId} deleted from memory`);
        // Delete from DB
        try {
            await prisma_1.default.room.delete({
                where: { code: roomId }
            });
            console.log(`[RoomManager] Room ${roomId} deleted from DB`);
        }
        catch (error) {
            console.error(`[RoomManager] Error deleting room ${roomId} from DB:`, error);
        }
    }
    emitUserCount(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        // Count users who are NOT in disconnect timeout (active)
        const activeCount = Array.from(room.users.keys()).filter(uid => !room.disconnectTimeouts.has(uid)).length;
        this.io.to(roomId).emit('room:users_count', { count: activeCount });
    }
    // Timer Methods
    getTimerValue(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return 0;
        const { timer } = room;
        if (!timer.running)
            return timer.accumulatedTime;
        const now = Date.now();
        const currentSegment = now - (timer.startTime || now);
        if (timer.type === 'countdown') {
            return Math.max(0, timer.initialTime - (timer.accumulatedTime + currentSegment));
        }
        return timer.accumulatedTime + currentSegment;
    }
    startTimer(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        if (!room.timer.running) {
            const now = Date.now();
            room.timer.running = true;
            room.timer.startTime = now;
            this.io.to(roomId).emit('timer:update', {
                value: this.getTimerValue(roomId),
                running: true,
                timestamp: now
            });
        }
    }
    pauseTimer(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        if (room.timer.running && room.timer.startTime) {
            const now = Date.now();
            room.timer.accumulatedTime += now - room.timer.startTime;
            room.timer.running = false;
            room.timer.startTime = null;
            this.io.to(roomId).emit('timer:update', {
                value: room.timer.accumulatedTime,
                running: false,
                timestamp: now
            });
        }
    }
    resetTimer(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        room.timer.running = false;
        room.timer.accumulatedTime = 0;
        room.timer.startTime = null;
        this.io.to(roomId).emit('timer:update', {
            value: room.timer.type === 'countdown' ? room.timer.initialTime : 0,
            running: false,
            timestamp: Date.now()
        });
    }
    setTimerConfig(roomId, config) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        room.timer.type = config.type;
        room.timer.initialTime = config.initialTime;
        room.timer.running = false;
        room.timer.accumulatedTime = 0;
        room.timer.startTime = null;
        this.io.to(roomId).emit('timer:config', config);
        this.io.to(roomId).emit('timer:update', {
            value: config.type === 'countdown' ? config.initialTime : 0,
            running: false,
            timestamp: Date.now()
        });
    }
    syncTimer(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return;
        const now = Date.now();
        this.io.to(socketId).emit('timer:update', {
            value: this.getTimerValue(roomId),
            running: room.timer.running,
            // Si está corriendo, damos el timestamp ACTUAL para que el cliente
            // calcule delta = 0 al arrancar (el value ya es el calculado ahora).
            timestamp: now
        });
        this.io.to(socketId).emit('timer:config', {
            type: room.timer.type,
            initialTime: room.timer.initialTime
        });
    }
    handleSocketDisconnect(socketId) {
        // Iterate all rooms to find user with this socketId
        for (const [roomId, room] of this.rooms.entries()) {
            for (const [userId, userState] of room.users.entries()) {
                if (userState.socketId === socketId) {
                    console.log(`[RoomManager] Socket ${socketId} (User ${userId}) disconnected from room ${roomId}`);
                    this.leaveRoom(roomId, userId);
                    return;
                }
            }
        }
    }
}
exports.default = RoomManager;
