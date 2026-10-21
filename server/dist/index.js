"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const roomHandler_1 = require("./handlers/roomHandler");
const timerHandler_1 = require("./handlers/timerHandler");
const messageHandler_1 = require("./handlers/messageHandler");
const roomManager_1 = __importDefault(require("./utils/roomManager"));
const prisma_1 = __importDefault(require("./utils/prisma"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const CLIENT_URL = process.env.CLIENT_URL;
// Allowed origins: prefer explicit CLIENT_URL; fall back to common localhost origins for dev
const allowedOrigins = CLIENT_URL ? [CLIENT_URL] : [
    'http://localhost:5173',
    'http://localhost:3000'
];
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            // allow non-browser clients (no origin) or allowedOrigins
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin))
                return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});
const roomManager = new roomManager_1.default(io);
// Strict CORS: only allow configured frontend origin (or localhost in dev)
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express_1.default.json());
// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});
// Lógica de Sockets
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);
    (0, roomHandler_1.roomHandler)(io, socket, roomManager);
    (0, timerHandler_1.timerHandler)(io, socket, roomManager);
    (0, messageHandler_1.messageHandler)(io, socket);
    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        roomManager.handleSocketDisconnect(socket.id);
    });
});
const PORT = process.env.PORT || 3000;
// If running in production require CLIENT_URL to be set so only your frontend can connect
if (process.env.NODE_ENV === 'production' && !CLIENT_URL) {
    console.error('[Startup] CLIENT_URL must be set in production to restrict allowed origins. Exiting.');
    process.exit(1);
}
// Al iniciar, limpiar todas las salas en DB porque el servidor arrancó fresco
// (RoomManager vacío = no hay usuarios activos en ninguna sala)
async function startServer() {
    try {
        const deleted = await prisma_1.default.room.deleteMany({});
        console.log(`[Startup] Limpiadas ${deleted.count} sala(s) de sesiones anteriores de la BD.`);
    }
    catch (err) {
        console.error('[Startup] Error limpiando salas viejas:', err);
    }
    httpServer.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}
startServer();
