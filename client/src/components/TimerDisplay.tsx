import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { formatTime } from '../lib/formatTime';
import { cn } from '../lib/utils';

export const TimerDisplay = ({ size = 'lg' }: { size?: 'sm' | 'lg' }) => {
    const { timer } = useStore();
    const [displayTime, setDisplayTime] = useState(timer.value);
    // Ref para poder reiniciar el loop desde el listener de visibilitychange
    const timerRef = useRef(timer);
    timerRef.current = timer;

    useEffect(() => {
        let animationFrameId: number;

        const computeValue = (): number => {
            const t = timerRef.current;
            if (!t.running) return t.value;
            const delta = Date.now() - t.lastActionTime;
            if (t.type === 'countdown') {
                return Math.max(0, t.value - delta);
            }
            return t.value + delta;
        };

        const update = () => {
            if (timerRef.current.running) {
                setDisplayTime(computeValue());
                animationFrameId = requestAnimationFrame(update);
            } else {
                setDisplayTime(timerRef.current.value);
            }
        };

        if (timer.running) {
            animationFrameId = requestAnimationFrame(update);
        } else {
            setDisplayTime(timer.value);
        }

        // Cuando la pestaña vuelve a estar visible, el navegador había pausado rAF.
        // Reiniciamos el loop y recalculamos el valor correcto en base a lastActionTime.
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                cancelAnimationFrame(animationFrameId);
                // Snap inmediato al valor correcto antes de que arranque el nuevo loop
                setDisplayTime(computeValue());
                if (timerRef.current.running) {
                    animationFrameId = requestAnimationFrame(update);
                }
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            cancelAnimationFrame(animationFrameId);
            document.removeEventListener('visibilitychange', onVisibilityChange);
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
