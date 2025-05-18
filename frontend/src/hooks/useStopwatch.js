// frontend/src/hooks/useStopwatch.js
import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Ein Hook für eine Stoppuhr.
 * @param {boolean} controlledIsActive Ob die Stoppuhr von außen gesteuert aktiv sein soll.
 * @returns {[number, () => void, () => void, () => void]} Ein Array mit:
 *  - elapsed: Die vergangene Zeit in Millisekunden.
 *  - resetStopwatch: Funktion zum Zurücksetzen der Stoppuhr.
 *  - startStopwatch: Funktion zum Starten der Stoppuhr.
 *  - pauseStopwatch: Funktion zum Pausieren der Stoppuhr.
 */
const useStopwatch = (controlledIsActive) => {
    const [elapsed, setElapsed] = useState(0);
    const [isRunning, setIsRunning] = useState(false); // Interner Laufstatus
    const intervalRef = useRef(null);
    const startTimeRef = useRef(0);

    // Effekt, der auf die externe Aktivierungssteuerung reagiert
    useEffect(() => {
        if (controlledIsActive) {
            if (!isRunning) { // Nur starten, wenn nicht schon läuft und von außen aktiviert
                setIsRunning(true);
                startTimeRef.current = Date.now() - elapsed; // Korrigiere Startzeit, falls schon was gelaufen ist
                console.log("[useStopwatch] Extern aktiviert, starte Timer. Elapsed war:", elapsed);
            }
        } else {
            if (isRunning) { // Nur pausieren, wenn läuft und von außen deaktiviert
                setIsRunning(false);
                console.log("[useStopwatch] Extern deaktiviert, pausiere Timer.");
            }
        }
    }, [controlledIsActive, isRunning, elapsed]); // elapsed hier wichtig für korrekte startTimeRef

    // Intervall-Logik
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setElapsed(Date.now() - startTimeRef.current);
            }, 100); // Update alle 100ms für zehntel Sekunden
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning]);

    const startStopwatch = useCallback(() => {
        // Diese Funktion ist eher für manuellen Start gedacht, wenn nicht extern gesteuert.
        // Bei externer Steuerung reagiert der useEffect auf controlledIsActive.
        if (!isRunning) {
            setIsRunning(true);
            startTimeRef.current = Date.now() - elapsed; // Wichtig, um bei Resume korrekt weiterzuzählen
            console.log("[useStopwatch] Manuell gestartet.");
        }
    }, [isRunning, elapsed]);

    const pauseStopwatch = useCallback(() => {
        setIsRunning(false);
        console.log("[useStopwatch] Manuell pausiert.");
    }, []);

    const resetStopwatch = useCallback(() => {
        setIsRunning(false);
        setElapsed(0);
        console.log("[useStopwatch] Zurückgesetzt.");
    }, []);

    // Gib die Zeit und die memoisierten Kontrollfunktionen zurück
    return [elapsed, resetStopwatch, startStopwatch, pauseStopwatch];
};

export default useStopwatch;
