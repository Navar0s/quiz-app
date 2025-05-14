import { useEffect, useRef } from 'react';

/**
 * WavePlayer
 * ----------
 * props:
 *  • src        – string  : Audio-URL
 *  • maxTime    – number  : Sekunden-Limit (0 = kein Limit)
 *  • onFinished – fn()    : Callback wenn Limit erreicht
 *
 *  Rendert:   <div id="wave"></div>  +  Play/Pause-Button
 */
export default function WavePlayer({ src, maxTime, onFinished }) {
    const waveRef = useRef(null);
    const wsRef   = useRef(null);      // wavesurfer instance
    const btnRef  = useRef(null);

    /* wavesurfer dynamisch laden & instanzieren */
    useEffect(() => {
        let active = true;
        (async () => {
            const WaveSurfer = (await import('wavesurfer.js')).default;
            if (!active) return;

            wsRef.current = WaveSurfer.create({
                container : waveRef.current,
                waveColor : '#3b82f6',
                progressColor: '#60a5fa',
                height: 80,
                barWidth: 2,
                cursorWidth: 0,
                backend: 'MediaElement',
                xhr: { withCredentials: false, mode: 'cors' },
            });

            wsRef.current.on('ready', () => {
                btnRef.current.disabled = false;
            });

            wsRef.current.on('finish', () => {
                btnRef.current.innerText = '▶';
                onFinished?.();
            });

            wsRef.current.on('play', () => {
                btnRef.current.innerText = '⏸';
            });
            wsRef.current.on('pause', () => {
                btnRef.current.innerText = '▶';
            });

            wsRef.current.load(src.startsWith('http') ? src : `${src}`);
        })();

        return () => { active = false; wsRef.current?.destroy(); };
    }, [src, onFinished]);

    /* maxTime-Grenze */
    useEffect(() => {
        if (!wsRef.current) return;
        if (!maxTime) return;

        const check = () => {
            if (wsRef.current.getCurrentTime() >= maxTime) {
                wsRef.current.pause();
                wsRef.current.seekTo(0);         // an den Anfang
                onFinished?.();
            }
        };
        wsRef.current.on('audioprocess', check);
        return () => wsRef.current.un('audioprocess', check);
    }, [maxTime, onFinished]);

    const toggle = () => wsRef.current?.isPlaying()
    ? wsRef.current.pause()
    : wsRef.current.play(0, maxTime || undefined);

    return (
        <div className="space-y-2">
        <div ref={waveRef} className="rounded bg-gray-800" />
        <button
        ref={btnRef}
        onClick={toggle}
        disabled
        className="bg-blue-500 hover:bg-blue-400 text-black font-bold px-4 py-1 rounded"
        >
        ▶
        </button>
        </div>
    );
}
