import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../lib/formatTime';
import { cn } from '../lib/utils';

export const TimerDisplay = ({ size = 'lg' }: { size?: 'sm' | 'lg' }) => {
    const { timer } = useStore();
    const [displayTime, setDisplayTime] = useState(timer.value);

    useEffect(() => {
        let animationFrameId: number;

        const update = () => {
            if (timer.running) {
                const now = Date.now();
                const delta = now - timer.lastActionTime;

                let newVal = timer.value + delta;
                if (timer.type === 'countdown') {
                    // En countdown, el backend manda el "timer value" inicial o acumulado?
                    // Según timerHandler.ts: getTimerValue devuelve el tiempo CALCULADO.
                    // Pero el 'timer.value' que llega en el evento update es el valor calculado en ese momento?
                    // timerHandler.ts: io.emit('timer:update', { value: getTimerValue(state), ... })
                    // getTimerValue retorna el tiempo restante en countdown.
                    // Entonces timer.value ES el tiempo restante al momento del evento.
                    // Si es countdown, debemos RESTAR el delta desde que llegó el evento.
                    newVal = Math.max(0, timer.value - delta); // Espera, timer.value ya decreció en el server?
                    // Si el server manda { value: 5000, timestamp: T1 } y ahora es T1 + 1000.
                    // El valor debería ser 4000.
                    // timer.value es el valor snapshot en T1.Correcto.
                } else {
                    newVal = Math.max(0, timer.value + delta);
                }

                setDisplayTime(newVal);
                animationFrameId = requestAnimationFrame(update);
            } else {
                setDisplayTime(timer.value);
            }
        };

        if (timer.running) {
            update();
        } else {
            setDisplayTime(timer.value);
        }

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [timer.running, timer.value, timer.lastActionTime, timer.type]);

    const { minutes, seconds, milliseconds } = formatTime(displayTime);

    return (
        <div className={cn(
            "font-mono font-bold tracking-wider text-text-primary-light dark:text-text-primary-dark tabular-nums flex items-end leading-none transition-colors duration-300",
            size === 'lg' ? "text-[8rem] sm:text-[10rem] md:text-[14rem]" : "text-5xl"
        )}>
            <span>{minutes}</span>
            <span className={cn("text-primary", timer.running && "animate-pulse")}>:</span>
            <span>{seconds}</span>
            <span className="text-3xl sm:text-5xl text-text-secondary-light dark:text-text-secondary-dark ml-2 mb-4 sm:mb-8">.{milliseconds}</span>
        </div>
    );
};
