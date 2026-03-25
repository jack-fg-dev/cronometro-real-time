export const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10); // 2 dígitos

    const pad = (n: number) => n.toString().padStart(2, '0');

    return {
        minutes: pad(minutes),
        seconds: pad(seconds),
        milliseconds: pad(milliseconds)
    };
};
