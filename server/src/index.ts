import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { roomHandler } from './handlers/roomHandler';
import { timerHandler } from './handlers/timerHandler';
import { messageHandler } from './handlers/messageHandler';
import RoomManager from './utils/roomManager';
import prisma from './utils/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
    }
});

const roomManager = new RoomManager(io);

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Lógica de Sockets
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    roomHandler(io, socket, roomManager);
    timerHandler(io, socket, roomManager);
    messageHandler(io, socket);

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        roomManager.handleSocketDisconnect(socket.id);
    });
});

const PORT = process.env.PORT || 3000;

// Al iniciar, limpiar todas las salas en DB porque el servidor arrancó fresco
// (RoomManager vacío = no hay usuarios activos en ninguna sala)
async function startServer() {
    try {
        const deleted = await prisma.room.deleteMany({});
        console.log(`[Startup] Limpiadas ${deleted.count} sala(s) de sesiones anteriores de la BD.`);
    } catch (err) {
        console.error('[Startup] Error limpiando salas viejas:', err);
    }

    httpServer.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}

startServer();

