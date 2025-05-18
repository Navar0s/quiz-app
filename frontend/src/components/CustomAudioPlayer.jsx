// frontend/src/components/CustomAudioPlayer.jsx
import React, { useEffect, useRef, useState, useImperativeHandle, useCallback } from 'react'; // useCallback hinzugefügt

// Wickel die Komponente in React.forwardRef
const CustomAudioPlayer = React.forwardRef(({
    src,
    offset = 0,
    relLimit = 0,
    maxSeek,
    onPlay,
    onPause,
    onEnded, // Hinzugefügt, da es im <audio>-Tag verwendet wird
    onPosition,
    onExposePause,
}, ref) => { // 'ref' kommt hier als zweites Argument
    const internalAudioRef = useRef(null); // Interne Ref für das <audio>-Element

    /* ---------- State ---------- */
    const [playing, setPlaying] = useState(false);
    const [posRel,  setPosRel ] = useState(0);
    const [dur,     setDur   ] = useState(0);
    const [vol,     setVol   ] = useState(1);
    const [muted,   setMuted ] = useState(false);
    const [started, setStart ] = useState(false);

    // Die externe Ref (von SoloQuiz) mit dem internen <audio>-Element verbinden
    // Dies ermöglicht es der Elternkomponente, auf das <audio>-DOM-Element zuzugreifen,
    // z.B. für audioPlayerRef.current.pause()
    useImperativeHandle(ref, () => internalAudioRef.current);


    /* Lautstärke */
    useEffect(() => {
        if (internalAudioRef.current) {
            internalAudioRef.current.volume = muted ? 0 : vol;
        }
    }, [vol, muted]);

    /* Quelle wechseln */
    useEffect(() => {
        const a = internalAudioRef.current;
        if (a) {
            a.pause();
            // Nur die Quelle setzen, wenn sie sich wirklich ändert, um unnötige Ladevorgänge zu vermeiden
            if (a.currentSrc !== src && src) { // currentSrc ist die aktuell geladene URL
                a.src = src;
                a.load(); // Wichtig nach src-Änderung
                //console.log("[CustomAudioPlayer] Neue Quelle geladen:", src);
            } else if (!src) { // Wenn src leer ist, auch src des Players leeren
                a.removeAttribute('src');
                a.load();
            }
            setPlaying(false); setPosRel(0); setDur(0); setStart(false);
        }
    }, [src]);

    /* Externen Pause-Handle exportieren (deine bestehende Logik) */
    useEffect(() => {
        if (!onExposePause) return;
        onExposePause(() => {
            if (internalAudioRef.current) {
                internalAudioRef.current.pause();
            }
            if (playing) { // Nur wenn es wirklich gespielt hat
                setPlaying(false);
                onPause?.(); // Aufruf der onPause Prop, falls vorhanden
            }
        });
    }, [onExposePause, playing, onPause]);


    /* Zeit + Limits */
    const tick = () => {
        const a = internalAudioRef.current;
        if (!a) return;

        const rel = Math.max(0, a.currentTime - offset);
        setPosRel(rel);
        onPosition?.(rel);

        if (relLimit && rel >= relLimit) {
            a.pause();
            a.currentTime = offset;
            setPlaying(false); setPosRel(0);
            onPause?.();
        }
    };

    /* Play / Pause */
    const toggle = () => {
        const a = internalAudioRef.current;
        if (!a || !a.src) return; // Nicht toggeln, wenn keine Quelle

        if (!started) {
            a.currentTime = offset;
            setStart(true);
        }
        if (playing) {
            a.pause();
            // setPlaying(false) und onPause?.() werden durch das 'pause'-Event des Audio-Elements gehandhabt
        } else {
            if (!dur && a.duration) setDur(a.duration); // Dauer setzen, wenn verfügbar
            a.play().catch((e) => console.error("[CustomAudioPlayer] Playback error:", e));
            // setPlaying(true) und onPlay?.() werden durch das 'play'-Event des Audio-Elements gehandhabt
        }
    };

    /* Seek */
    const seek = e => {
        const a = internalAudioRef.current;
        if (!a || !a.src || isNaN(a.duration)) return; // Nicht seeken, wenn keine Quelle oder Dauer

        const pct  = +e.target.value;
        const effectiveDur = (dur > 0 ? dur : a.duration) - offset; // Nutze State `dur` oder aktuelle Dauer
        const cap  = (maxSeek ?? relLimit) || effectiveDur || 1;

        // Stelle sicher, dass cap nicht 0 oder negativ ist, um Division durch Null zu vermeiden
        if (cap <= 0) return;

        let dst  = offset + cap * pct;

        if (maxSeek !== undefined && dst - offset > maxSeek) {
            // Optional: Auf maxSeek begrenzen statt gar nicht zu seeken
            // dst = offset + maxSeek;
            return;
        }
        // Begrenze dst auf die tatsächliche Dauer des Songs
        dst = Math.max(offset, Math.min(dst, offset + effectiveDur));


        a.currentTime = dst;
        setPosRel(dst - offset); // Aktualisiere sofort für bessere UI-Reaktion
        onPosition?.(dst - offset);
    };

    const mmss   = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s)%60).padStart(2,'0')}`;
    // Nutze `dur` aus dem State, wenn verfügbar, sonst die aktuelle Dauer des Audio-Elements
    const displayDuration = dur > 0 ? dur - offset : (internalAudioRef.current?.duration ? internalAudioRef.current.duration - offset : 0);
    const capRel = (maxSeek ?? relLimit) || displayDuration || 1;


    /* ---------- Icons ---------- */
    const PlayIcon = React.memo(() => <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 16 16" fill="currentColor"><polygon points="0,0 16,8 0,16" /></svg>);
    PlayIcon.displayName = 'PlayIcon';

    const PauseIcon = React.memo(() => <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 16 16" fill="currentColor"><rect width="6" height="16" /><rect x="10" width="6" height="16" /></svg>);
    PauseIcon.displayName = 'PauseIcon';

    // Das gleiche auch für VolIcon und MuteIcon, falls dort ähnliche Probleme auftreten könnten,
    // obwohl sie seltener geklickt werden, während sich der Player-Status schnell ändert.
    const VolIcon = React.memo(() => <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>);
    VolIcon.displayName = 'VolIcon';

    const MuteIcon = React.memo(() => <svg className="w-4 h-4 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>);
    MuteIcon.displayName = 'MuteIcon';

    const togglePlayPause = useCallback(() => {
        const a = internalAudioRef.current;
        if (!a || !a.src) return;

        if (!started) { // 'started' ist ein State in deinem Player
            a.currentTime = offset; // 'offset' ist eine Prop
            setStart(true); // 'setStart' ist die Setter-Funktion für 'started'
        }
        if (playing) {
            a.pause();
            // onPause(); // Wird durch <audio onPause={...}> gehandhabt
        } else {
            if (!dur && a.duration) setDur(a.duration); // 'dur' und 'setDur' sind States
            a.play().catch((e) => console.error("[CustomAudioPlayer] Playback error:", e));
            // onPlay(); // Wird durch <audio onPlay={...}> gehandhabt
        }
    }, [playing, started, offset, dur]);

    return (
        <div className="space-y-2 text-white">
        <div className="flex items-center gap-3">
        <button
        onClick={togglePlayPause} // Verwendet die memoïsierte Funktion
        className="p-2 rounded bg-blue-500 hover:bg-blue-400 z-50 text-white"
        title={playing ? "Pause" : "Play"}
        disabled={!src} // Deaktiviere, wenn keine Quelle
        >
        {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <input
        type="range" min="0" max="1" step="0.001" // Feinerer Step für sanfteres Seeking
        value={capRel > 0 ? posRel / capRel : 0} // Verhindere Division durch 0
        onChange={seek}
        className="flex-1 accent-blue-500 h-2 bg-gray-700 rounded-lg cursor-pointer"
        disabled={!src || isNaN(capRel)}  // Deaktiviere, wenn keine Quelle oder Dauer
        />

        <span className="w-12 text-right tabular-nums text-sm">{mmss(posRel)}</span>

        <div className="relative group">
        <button onClick={() => setMuted(!muted)} className="ml-2 peer text-white" title={muted ? "Stummschaltung aufheben" : "Stumm schalten"}>
        {muted || vol === 0 ? <MuteIcon /> : <VolIcon />}
        </button>
        <input
        type="range" min="0" max="1" step="0.05"
        value={muted ? 0 : vol} // Zeige 0 wenn muted
        onChange={e => { setMuted(false); setVol(+e.target.value); }}
        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-24 accent-blue-500
        opacity-0 pointer-events-none transition-opacity duration-150
        group-hover:opacity-100 group-hover:pointer-events-auto
        peer-focus:opacity-100 peer-focus:pointer-events-auto
        focus:opacity-100 focus:pointer-events-auto
        h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        disabled={!src} // Deaktiviere, wenn keine Quelle
        />
        </div>
        </div>

        <audio
        ref={internalAudioRef} // Hier wird die interne Ref an das Audio-Element übergeben
        // hidden // hidden entfernt, um Browser-Standard-Controls zu sehen, FALLS eigene Controls nicht funktionieren
        // controls // Testweise Controls anzeigen
        preload="metadata" // metadata ist gut, auto kann viel laden
        onTimeUpdate={tick}
        onLoadedMetadata={() => {
            if (internalAudioRef.current) {
                setDur(internalAudioRef.current.duration);
                //console.log("[CustomAudioPlayer] Metadaten geladen, Dauer:", internalAudioRef.current.duration);
            }
        }}
        onPlay={() => {
            setPlaying(true);
            onPlay?.(); // Rufe die onPlay Prop der Elternkomponente
        }}
        onPause={() => {
            setPlaying(false);
            onPause?.(); // Rufe die onPause Prop der Elternkomponente
        }}
        onEnded={() => {
            //console.log("[CustomAudioPlayer] Audio ended Event");
            setPlaying(false);
            setPosRel(0); // Position zurücksetzen, wenn Song endet
            setStart(false); // Erlaube Neustart von offset
            if (internalAudioRef.current) internalAudioRef.current.currentTime = offset; // Setze Zeit zurück
            onEnded?.(); // Rufe die onEnded Prop der Elternkomponente
        }}
        onError={(e) => {
            console.error("[CustomAudioPlayer] HTML Audio Element Fehler:", e.target.error);
            setPlaying(false);
            // Optional: onPause oder eine spezielle onError Prop rufen
        }}
        />
        </div>
    );
});
CustomAudioPlayer.displayName = 'CustomAudioPlayer'; // Für bessere DevTools Anzeige
export default CustomAudioPlayer;
