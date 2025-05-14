import { useEffect, useRef, useState } from 'react';

/*  Generischer Audioplayer mit
 *    – relLimit  (klassisches Versuchslimit)
 *    – maxSeek   (Zeitrennen-Limit)
 *    – onPlay / onPause / onPosition
 *    – onExposePause  ⇒ liefert dem Parent eine Pause-Funktion              */
export default function CustomAudioPlayer({
    src,
    offset   = 0,
    relLimit  = 0,
    maxSeek,
    onPlay,
    onPause,
    onPosition,
    onExposePause,          // <—— neu
}) {
    const audio = useRef(null);

    /* ---------- State ---------- */
    const [playing, setPlaying] = useState(false);
    const [posRel,  setPosRel ] = useState(0);   // Sek seit offset
    const [dur,     setDur   ] = useState(0);
    const [vol,     setVol   ] = useState(1);
    const [muted,   setMuted ] = useState(false);
    const [started, setStart ] = useState(false);

    /* Lautstärke */
    useEffect(() => { audio.current.volume = muted ? 0 : vol; }, [vol, muted]);

    /* Quelle wechseln */
    useEffect(() => {
        const a = audio.current;
        a.pause(); a.src = src; a.load();
        setPlaying(false); setPosRel(0); setDur(0); setStart(false);
    }, [src]);

    /* Externen Pause-Handle exportieren */
    useEffect(() => {
        if (!onExposePause) return;
        onExposePause(() => {                       // liefert Funktion an Parent
            audio.current.pause();
            if (playing) {
                setPlaying(false);
                onPause?.();
            }
        });
    }, [onExposePause, playing, onPause]);

    /* Zeit + Limits */
    const tick = () => {
        const a   = audio.current;
        const rel = Math.max(0, a.currentTime - offset);
        setPosRel(rel);
        onPosition?.(rel);

        if (relLimit && rel >= relLimit) {          // klassisches Limit
            a.pause(); a.currentTime = offset;
            setPlaying(false); setPosRel(0); onPause?.();
        }
    };

    /* Play / Pause */
    const toggle = () => {
        const a = audio.current;
        if (!started) { a.currentTime = offset; setStart(true); }
        if (playing) {
            a.pause(); setPlaying(false); onPause?.();
        } else {
            if (!dur) setDur(a.duration || 0);
            a.play().catch(() => {});
            setPlaying(true); onPlay?.();
        }
    };

    /* Seek */
    const seek = e => {
        const pct  = +e.target.value;
        const cap  = (maxSeek ?? relLimit) || (dur - offset) || 1;
        const dst  = offset + cap * pct;
        if (maxSeek !== undefined && dst - offset > maxSeek) return; // Limit

        audio.current.currentTime = dst;
        setPosRel(dst - offset);
        onPosition?.(dst - offset);
    };

    const mmss   = s => `${String((s/60)|0).padStart(2,'0')}:${String((s|0)%60).padStart(2,'0')}`;
    const capRel = (maxSeek ?? relLimit) || (dur - offset) || 1;

    /* ---------- Icons ---------- */
    const Play  = () => <svg className="w-4 h-4"><polygon points="0,0 16,8 0,16" /></svg>;
    const Pause = () => <svg className="w-4 h-4"><rect width="6" height="16" /><rect x="10" width="6" height="16" /></svg>;
    const Vol   = () => <svg className="w-4 h-4"><path d="M3 9v6h4l5 5V4L7 9H3z" /><path d="M15 9a3 3 0 010 6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
    const Mute  = () => <svg className="w-4 h-4"><path d="M3 9v6h4l5 5V4L7 9H3z" /><line x1="17" y1="8" x2="23" y2="14" stroke="currentColor" strokeWidth="2" /><line x1="23" y1="8" x2="17" y2="14" stroke="currentColor" strokeWidth="2" /></svg>;

    return (
        <div className="space-y-2">
        <div className="flex items-center gap-3">
        {/* ▶ / ⏸  – hoher z-Index, damit nichts überlappt */}
        <button
        onClick={toggle}
        className="p-2 rounded bg-blue-500 hover:bg-blue-400 z-50"
        >
        {playing ? <Pause /> : <Play />}
        </button>

        {/* Progress */}
        <input
        type="range" min="0" max="1" step="0.01"
        value={posRel / capRel}
        onChange={seek}
        className="flex-1 accent-blue-500"
        />

        {/* Zeit */}
        <span className="w-12 text-right tabular-nums">{mmss(posRel)}</span>

        {/* Volume */}
        <div className="relative group">
        <button onClick={() => setMuted(!muted)} className="ml-2 peer">
        {muted || vol === 0 ? <Mute /> : <Vol />}
        </button>
        <input
        type="range" min="0" max="1" step="0.05"
        value={vol}
        onChange={e => { setMuted(false); setVol(+e.target.value); }}
        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-24 accent-blue-500
        opacity-0 pointer-events-none
        group-hover:opacity-100 group-hover:pointer-events-auto
        peer-focus:opacity-100 peer-focus:pointer-events-auto
        focus:opacity-100 focus:pointer-events-auto"
        />
        </div>
        </div>

        {/* Hidden <audio> */}
        <audio
        ref={audio}
        hidden
        preload="auto"
        onTimeUpdate={tick}
        onEnded={() => { setPlaying(false); onPause?.(); }}
        />
        </div>
    );
}
