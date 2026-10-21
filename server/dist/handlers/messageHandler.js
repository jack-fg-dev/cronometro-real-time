"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageHandler = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const messageHandler = (io, socket) => {
    const getRoom = () => {
        const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
        return rooms[0];
    };
    const sendMessage = async (payload) => {
        const roomId = getRoom();
        if (!roomId)
            return;
        try {
            // Buscar roomId real de la base de datos basado en el código (que es lo que usó para unirse)
            // Ojo: en roomHandler.ts socket.join(room.code) usa el código.
            // Pero para guardar en DB necesitamos el ID interno (UUID/CUID).
            // Debemos buscar la sala por código.
            const room = await prisma_1.default.room.findUnique({
                where: { code: roomId }
            });
            if (!room) {
                socket.emit('error', { message: 'Room not found for message' });
                return;
            }
            const message = await prisma_1.default.message.create({
                data: {
                    content: payload.content,
                    type: payload.priority,
                    roomId: room.id,
                },
            });
            // Emitir a todos en la sala incluido el remitente
            io.to(roomId).emit('message:new', {
                id: message.id,
                content: message.content,
                priority: message.type,
                createdAt: message.createdAt
            });
        }
        catch (error) {
            console.error('Error enviando mensaje:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    };
    socket.on('message:send', sendMessage);
    socket.on('message:delete', async ({ messageId }) => {
        const roomId = getRoom();
        if (!roomId)
            return;
        try {
            await prisma_1.default.message.delete({
                where: { id: messageId }
            }).catch(() => {
                // Si ya fue borrado, ignorar
            });
            io.to(roomId).emit('message:deleted', { messageId });
        }
        catch (error) {
            console.error('Error eliminando mensaje:', error);
        }
    });
};
exports.messageHandler = messageHandler;
