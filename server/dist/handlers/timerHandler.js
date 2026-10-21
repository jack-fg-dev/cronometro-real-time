"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timerHandler = void 0;
const timerHandler = (io, socket, roomManager) => {
    const getRoomId = () => {
        // We can get roomId from socket rooms (excluding socket.id)
        // This is safe because user joins room in roomHandler
        const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
        return rooms[0];
    };
    const startTimer = () => {
        const roomId = getRoomId();
        if (!roomId)
            return;
        roomManager.startTimer(roomId);
    };
    const pauseTimer = () => {
        const roomId = getRoomId();
        if (!roomId)
            return;
        roomManager.pauseTimer(roomId);
    };
    const resetTimer = () => {
        const roomId = getRoomId();
        if (!roomId)
            return;
        roomManager.resetTimer(roomId);
    };
    const setTimer = (payload) => {
        const roomId = getRoomId();
        if (!roomId)
            return;
        roomManager.setTimerConfig(roomId, payload);
    };
    const requestSync = () => {
        const roomId = getRoomId();
        if (!roomId)
            return;
        roomManager.syncTimer(roomId, socket.id);
    };
    socket.on('timer:start', startTimer);
    socket.on('timer:pause', pauseTimer);
    socket.on('timer:reset', resetTimer);
    socket.on('timer:set', setTimer);
    socket.on('timer:sync', requestSync);
};
exports.timerHandler = timerHandler;
