import { useEffect, useRef, useState } from 'react';

/** Sehr genauer Stoppuhr-Hook (requestAnimationFrame).
 *  Gibt [ms, reset] zurück. */
export default function useStopwatch(isRunning) {
    const [elapsed, setElapsed] = useState(0);
    const raf   = useRef(null);
    const base  = useRef(0);

    /* Start / Stopp */
    useEffect(() => {
        if (!isRunning) {
            cancelAnimationFrame(raf.current);
            return;
        }
        base.current = performance.now() - elapsed;
        const step = (t) => {
            setElapsed(t - base.current);
            raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf.current);
    }, [isRunning]);

    /** Reset auf 0 ms */
    const reset = () => { setElapsed(0); base.current = performance.now(); };

    return [elapsed, reset];
}
