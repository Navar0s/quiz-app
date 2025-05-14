// frontend/src/SoloQuiz.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams }      from 'react-router-dom';
import { API }                              from './api'; // Annahme: API ist korrekt exportiert
import QuizLayout                           from './QuizLayout'; // Pfad prüfen
import Card                                 from './components/Card'; // Pfad prüfen
import Input                                from './components/Input'; // Pfad prüfen
import Button                               from './components/Button'; // Pfad prüfen
import CustomAudioPlayer                    from './components/CustomAudioPlayer'; // Pfad prüfen
import useStopwatch                         from './hooks/useStopwatch'; // Pfad prüfen
import Modal                                from './components/Modal'; // Pfad prüfen
import { SCORE_CONFIG, metadataFieldsConfig } from './config/quizConfig'; // Score-Konfig und metadataFieldsConfig importieren

/* ---------- Konstanten ---------- */
const FREEMODE_ATTEMPTS = 6;

const normalizeText = (text) => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const tipOrder = {
  Filme: ['Erscheinungsjahr', 'Genre', 'Regie', 'Darsteller', 'Zitat'],
  Serien: ['Startjahr', 'Endjahr', 'Genre', 'Staffelanzahl', 'Handlungsort', 'Nebencharakter'],
  Games: ['Erscheinungsjahr', 'Genre', 'Plattform', 'Entwickler', 'Nebenfigur'],
  Musik: ['Album', 'Genre'], // Stelle sicher, dass 'Genre' der korrekte Key in metadataFieldsConfig.Musik ist
  Sonstiges: ['Quelle', 'Jahr', 'Notizen']
};

const msToString = ms => {
  if (typeof ms !== 'number' || isNaN(ms)) return '00:00.0';
  const t  = Math.round(ms/100)/10;
  const mm = String(Math.floor(t/60)).padStart(2,'0');
  const ss = String((t%60).toFixed(1)).padStart(4,'0');
  return `${mm}:${ss}`;
};

const PROBLEM_TYPES = [
  { value: "playback_error", label: "Wiedergabefehler (spielt nicht, Stottern)" },
  { value: "wrong_info", label: "Falscher Titel / Interpret / Metadaten" },
{ value: "audio_quality", label: "Schlechte Audioqualität (Rauschen, leise)" },
{ value: "length_issue", label: "Problem mit Länge (zu kurz, zu lang, Stille)" },
{ value: "other", label: "Sonstiges Problem" },
];

export default function SoloQuiz() {
  const nav          = useNavigate();
  const [params]     = useSearchParams();

  const modeParam    = params.get('mode') || 'freemode';
  const effectiveMode = modeParam.includes('timetrial') ? 'TimeTrial' : 'Freemode';

  const questionCnt  = +params.get('count') || 10;
  const cats         = useMemo(() => params.getAll('categories'), [params]);
  const catLabel     = cats.length && !cats.includes('Alle') ? cats.join(', ') : 'Alle Kategorien';

  /* ---------- State ---------- */
  const [db, setDb]           = useState([]);
  const [songs, setSongs]     = useState([]);
  const [idx, setIdx]         = useState(0);
  const [attemptCount, setAttemptCount] = useState(1);
  const [fails, setFails]     = useState(0);
  const [shownTips, setShownTips] = useState([]);
  const [guess, setGuess]     = useState('');
  const [sug, setSug]         = useState([]);
  const [hist, setHist]       = useState([]);
  const [info, setInfo]       = useState('');
  const [end, setEnd]         = useState(false); // Frage beendet
  const [solved, setSol]      = useState(false); // Frage richtig gelöst
  const [done, setDone]       = useState(false); // Quiz beendet
  const [playing, setPlaying] = useState(false);
  const [maxSeek, setMaxSeek] = useState(0);
  const playerPauseRef        = useRef(()=>{});

  const [songScores, setSongScores] = useState([]);
  const [totalScore, setTotalScore] = useState(0);

  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReportProblemType, setCurrentReportProblemType] = useState('');
  const [currentReportComment, setCurrentReportComment] = useState('');
  const [reportStatus, setReportStatus] = useState('');

  const stopwatchActive = effectiveMode === 'TimeTrial' && playing && !end && !done;
  const [elapsed, resetSw, startSwInternal, pauseSwInternal] = useStopwatch(stopwatchActive);
  const songStartTimeRef = useRef(0);

  useEffect(() => {
    console.log(`[SoloQuiz] Stopwatch Check - active: ${stopwatchActive}, effectiveMode: ${effectiveMode}, playing: ${playing}, end: ${end}, done: ${done}`);
  }, [stopwatchActive, effectiveMode, playing, end, done]);


  /* ---------- Songs laden ---------- */
  useEffect(() => {
    console.log("[SoloQuiz] useEffect[loadSongs]: Init. Modus Param:", modeParam, "Effektiver Modus:", effectiveMode, "Kategorien:", cats.join(', ') || "Alle", "Anzahl:", questionCnt);
    fetch(`${API}/songs`)
    .then(r => { if (!r.ok) throw new Error(`HTTP Fehler ${r.status}`); return r.json(); })
    .then(all => {
      if (!Array.isArray(all)) throw new Error("Empfangene Song-Daten sind kein Array");
      const filtered = cats.length===0 || cats.includes('Alle') ? all : all.filter(s => cats.includes(s.category));
      const songsWithReportField = filtered.map(s => ({ ...s, reportedIssues: s.reportedIssues || [] }));
      const finalQuizSongs = songsWithReportField.sort(()=>Math.random()-0.5).slice(0, questionCnt);

      if (finalQuizSongs.length === 0) {
        console.warn("[SoloQuiz] Keine Songs nach Filterung gefunden. Zeige Meldung.");
        setSongs([]);
        setDb(all); // db trotzdem setzen für Autocomplete, falls Suche über alle Titel geht
        setInfo("Keine Songs für diese Auswahl gefunden. Bitte ändere die Konfiguration.");
        setDone(true); // Quiz kann nicht gestartet werden
        return;
      }

      setDb(all);
      setSongs(finalQuizSongs);
      console.log("[SoloQuiz] useEffect[loadSongs]: Quiz-Songs ausgewählt:", finalQuizSongs.length);

      setIdx(0); setAttemptCount(1); setFails(0); setShownTips([]);
      setGuess(''); setSug([]); setHist([]); setInfo('');
      setEnd(false); setSol(false); setDone(false);
      resetSw();
      if (effectiveMode === 'TimeTrial') {
        songStartTimeRef.current = 0;
        startSwInternal();
      }
      setMaxSeek(0); setPlaying(false);
      setShowReportModal(false); setCurrentReportProblemType(''); setCurrentReportComment(''); setReportStatus('');
      setSongScores([]); setTotalScore(0);
      console.log("[SoloQuiz] useEffect[loadSongs]: Alle relevanten States für Quizstart zurückgesetzt.");
    })
    .catch(err => { console.error("[SoloQuiz] Fehler beim Laden der Songs:", err); setInfo(`❌ Fehler Songs: ${err.message}`); setSongs([]); setDb([]); setDone(true); });
  }, [cats, questionCnt, modeParam, effectiveMode, resetSw, startSwInternal]);

  /* ---------- Auto-Complete ---------- */
  useEffect(() => {
    if (!guess) { setSug([]); return; }
    const normalizedGuess = normalizeText(guess);
    const suggestions = new Set();
    db.forEach(song => {
      if (song.title && normalizeText(song.title).includes(normalizedGuess)) { suggestions.add(song.title); }
      if (Array.isArray(song.alternativeTitles)) {
        song.alternativeTitles.forEach(alt => { if (alt && normalizeText(alt).includes(normalizedGuess)) { suggestions.add(song.title); } });
      }
    });
    const list = Array.from(suggestions).slice(0, 5);
    const exactMatchInSuggestions = list.some(item => normalizeText(item) === normalizedGuess);
    setSug(guess && list.length > 0 && !exactMatchInSuggestions ? list : []);
  }, [guess, db]);

  const cur = songs[idx] ?? {};

  useEffect(() => {
    if (idx > 0 && effectiveMode === 'TimeTrial' && !done && !end) {
      songStartTimeRef.current = elapsed;
      console.log(`[SoloQuiz] Neuer Song (idx ${idx}), setze songStartTimeRef auf ${elapsed}`);
    }
  }, [idx, effectiveMode, done, end, elapsed]);


  const addHist = line => setHist(h => [line, ...h.slice(0, 4)]);

  const calculateFreemodeScore = useCallback((numIncorrectAttempts) => {
    if (numIncorrectAttempts >= FREEMODE_ATTEMPTS) {
      return 0;
    }
    const score = SCORE_CONFIG.Freemode.MAX_POINTS_PER_SONG -
    (numIncorrectAttempts * SCORE_CONFIG.Freemode.DEDUCTION_PER_WRONG_ATTEMPT);
    return Math.max(0, score);
  }, []);

  const calculateTimeTrialScore = useCallback((timeTakenMs, numIncorrectAttempts) => {
    const timeTakenSeconds = Math.round(timeTakenMs / 1000);
    const score = SCORE_CONFIG.TimeTrial.BASE_POINTS_PER_SONG -
    (timeTakenSeconds * SCORE_CONFIG.TimeTrial.TIME_DEDUCTION_PER_SECOND) -
    (numIncorrectAttempts * SCORE_CONFIG.TimeTrial.WRONG_ATTEMPT_DEDUCTION);
    return Math.max(0, score);
  }, []);

  const recordSongResult = useCallback((songData, guessed, numIncorrectAttemptsForSong, skippedOrDnf = false) => {
    if (!songData || !songData._id) {
      console.warn("[SoloQuiz] recordSongResult: Ungültige songData oder songData._id fehlt.");
      return;
    }
    console.log(`[SoloQuiz] recordSongResult für Song "${songData.title}": guessed=${guessed}, fails=${numIncorrectAttemptsForSong}, skippedOrDnf=${skippedOrDnf}, mode=${effectiveMode}`);

    let score = 0;
    let timeTakenForSongMs;

    if (effectiveMode === 'Freemode') {
      if (guessed) {
        score = calculateFreemodeScore(numIncorrectAttemptsForSong);
      } else {
        score = 0;
      }
    } else if (effectiveMode === 'TimeTrial') {
      timeTakenForSongMs = Math.max(0, elapsed - songStartTimeRef.current);
      // Im TimeTrial wird die Formel immer angewendet, auch bei Skip/DNF,
      // es sei denn, es gibt eine spezielle Regel (z.B. Skip = 0 Punkte immer).
      // Für DNF oder Skip könnten wir die `numIncorrectAttemptsForSong` anpassen oder eine Zeitstrafe hinzufügen.
      // Aktuell verwenden wir die direkten Werte.
      score = calculateTimeTrialScore(timeTakenForSongMs, numIncorrectAttemptsForSong);
    }

    const newSongScoreEntry = {
      songId: songData._id,
      title: songData.title,
      score: score,
      guessed: guessed,
      attemptsMade: numIncorrectAttemptsForSong + (guessed ? 1 : 0),
                                       skippedOrDnf: skippedOrDnf,
                                       ...(effectiveMode === 'TimeTrial' && { timeTakenSeconds: Math.round((timeTakenForSongMs || 0) / 1000) })
    };

    console.log("[SoloQuiz] Neues Song-Ergebnis:", newSongScoreEntry);
    setSongScores(prev => [...prev, newSongScoreEntry]);
    setTotalScore(prev => prev + score);
    setEnd(true);
    if (playing && playerPauseRef.current) {
      playerPauseRef.current(); // Player pausieren, da Frage vorbei
    }
    setPlaying(false); // Sicherstellen, dass playing State aktuell ist
  }, [effectiveMode, elapsed, calculateFreemodeScore, calculateTimeTrialScore, playing]);


  const revealNextTip = (currentFailsCount) => {
    if (!cur.metadata || !cur.category || !metadataFieldsConfig) return;
    const categoryTipsOrder = tipOrder[cur.category];
    if (!categoryTipsOrder) return;

    if (currentFailsCount < categoryTipsOrder.length) {
      const tipKey = categoryTipsOrder[currentFailsCount];
      const tipValue = cur.metadata[tipKey];
      if (tipValue) {
        const fieldConfig = metadataFieldsConfig[cur.category]?.find(f => f.key === tipKey);
        const readableTipKey = fieldConfig ? fieldConfig.label : tipKey.replace(/([A-Z])/g, ' $1').trim();
        const newTip = `${readableTipKey}: ${tipValue}`;
        console.log(`[SoloQuiz] Zeige Tipp (Fail #${currentFailsCount + 1}): ${newTip}`);
        setShownTips(prevTips => {
          if (!prevTips.some(tip => tip.startsWith(readableTipKey + ':'))) {
            return [...prevTips, newTip];
          }
          return prevTips;
        });
      } else {
        console.warn(`[SoloQuiz] Kein Wert für Tipp '${tipKey}' bei Song '${cur.title}'. Fail #${currentFailsCount + 1}`);
      }
    }
  };

  const handleSubmitAttempt = (isSkipped = false) => {
    console.log(`[SoloQuiz] handleSubmitAttempt - skipped: ${isSkipped}, guess: "${guess}", song-end: ${end}, quiz-done: ${done}, song-solved: ${solved}, current-fails: ${fails}`);
    if (end || !cur._id ) {
      console.log("[SoloQuiz] handleSubmitAttempt: Aktion blockiert (Frage beendet oder kein aktueller Song).");
      return;
    }

    if (isSkipped) {
      addHist('⏭️ Übersprungen');
      setInfo(`Lösung war: ${cur.title}`);
      recordSongResult(cur, false, fails, true);
      return;
    }

    if (!guess.trim()) {
      console.log("[SoloQuiz] handleSubmitAttempt: Leere Eingabe, ignoriere.");
      return;
    }

    const normalizedPlayerAnswer = normalizeText(guess);
    const mainTitleNormalized = normalizeText(cur.title);
    const altTitlesNormalized = Array.isArray(cur.alternativeTitles) ? cur.alternativeTitles.map(alt => normalizeText(alt)) : [];
    const isCorrect = mainTitleNormalized === normalizedPlayerAnswer || altTitlesNormalized.includes(normalizedPlayerAnswer);

    addHist(isCorrect ? `✅ ${guess}` : `❌ ${guess}`);

    if (isCorrect) {
      setInfo('🎉 Richtig!');
      setSol(true);
      recordSongResult(cur, true, fails, false);
    } else {
      revealNextTip(fails);
      const newFails = fails + 1;
      setFails(newFails);
      setGuess('');
      setSug([]);

      if (effectiveMode === 'Freemode') {
        const nextAttemptCount = attemptCount + 1;
        setAttemptCount(nextAttemptCount);
        if (nextAttemptCount > FREEMODE_ATTEMPTS) {
          setInfo(`Lösung war: ${cur.title}`);
          recordSongResult(cur, false, newFails, false);
        } else {
          setInfo('Leider falsch...');
        }
      } else { // TimeTrial
        setInfo('Leider falsch...');
      }
    }
  };

  const handleNextSong = () => {
    console.log("[SoloQuiz] handleNextSong. Aktueller idx:", idx, "Frage beendet (end):", end);

    if (effectiveMode === 'TimeTrial' && !end && cur._id) {
      console.log("[SoloQuiz] handleNextSong: TimeTrial Song nicht explizit beendet (z.B. durch Klick auf Next), werte als DNF.");
      recordSongResult(cur, false, fails, true); // DNF
    }

    if (idx + 1 < songs.length) {
      setIdx(i => i + 1);
      setAttemptCount(1); setFails(0); setShownTips([]);
      setGuess(''); setSug([]); setHist([]); setInfo('');
      setEnd(false); setSol(false);
      setPlaying(false); // Player sollte für neuen Song gestoppt sein, Autoplay wird durch Player/useEffect gesteuert
      if (effectiveMode === 'TimeTrial') {
        // songStartTimeRef wird im useEffect auf idx gesetzt
        // Stoppuhr läuft weiter, aber player sollte pausiert sein und neu starten
      }
      setMaxSeek(0);
      setCurrentReportProblemType(''); setCurrentReportComment(''); setReportStatus('');
      console.log("[SoloQuiz] handleNextSong: Nächster Song (Index", idx + 1, ") vorbereitet.");
    } else {
      console.log("[SoloQuiz] handleNextSong: Quiz beendet (done=true).");
      setDone(true);
      setPlaying(false);
      // Stoppuhr wird im useEffect auf `done` pausiert
    }
  };

  useEffect(() => {
    if (done) {
      if (effectiveMode === 'TimeTrial' && stopwatchActive) {
        pauseSwInternal();
      }
      const quizResults = {
        modeParam: modeParam,
        effectiveMode: effectiveMode,
        totalScore: totalScore,
        songDetails: songScores,
        questionCount: songs.length,
        quizTimestamp: new Date().toISOString(),
            ...(effectiveMode === 'TimeTrial' && { totalTimeMs: elapsed, totalTimeFormatted: msToString(elapsed) })
      };
      console.log("FINALE QUIZ ERGEBNISSE:", quizResults);
      // Hier Logik für Highscore-Speicherung, wenn modeParam auf 'HS' hindeutet.
      // Z.B. if (modeParam.includes('HS')) { nav('/submit-highscore', { state: { quizResults } }); }
    }
  }, [done, modeParam, effectiveMode, totalScore, songScores, songs.length, elapsed, pauseSwInternal, stopwatchActive, nav]);


  const openReportModal = () => {
    if (!cur._id) return;
    setReportStatus(''); setCurrentReportProblemType(PROBLEM_TYPES[0].value); setCurrentReportComment('');
    setShowReportModal(true);
    if(playing && playerPauseRef.current) {
      playerPauseRef.current();
    }
  };
  const closeReportModal = () => setShowReportModal(false);

  const handleReportSubmit = async () => {
    if (!cur._id || !currentReportProblemType) { setReportStatus('Fehler: Problemtyp auswählen.'); return; }
    setReportStatus('Sende Meldung...');
    try {
      const response = await fetch(`${API}/songs/${cur._id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemType: currentReportProblemType, comment: currentReportComment }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({error: "Unbekannter Serverfehler"}));
        throw new Error(errData.error || `Serverfehler ${response.status}`);
      }
      setReportStatus('✅ Meldung gesendet!');
      setTimeout(closeReportModal, 2000);
    } catch (error) {
      console.error("[SoloQuiz] Fehler beim Senden des Bug Reports:", error);
      setReportStatus(`❌ Fehler: ${error.message}`);
    }
  };

  if (done && songs.length === 0 && info.startsWith("Keine Songs")) { // Spezialfall: Keine Songs gefunden
    return (
      <QuizLayout>
      <Card className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-orange-400">Keine Songs</h2>
      <p>{info}</p>
      <Button onClick={() => nav('/solo-config')} className="mt-4 w-full">Zurück zur Konfiguration</Button>
      </Card>
      </QuizLayout>
    );
  }

  if (done) {
    const gesamtZeitFormatiert = effectiveMode === 'TimeTrial' ? msToString(elapsed) : null;
    return (
      <QuizLayout>
      <Card className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-green-400">🎉 Quiz beendet!</h2>
      <p>Modus: <span className="font-semibold">{
        modeParam === 'timetrial' ? 'Zeittrennen' :
        modeParam === 'freemode' ? '6 Versuche' :
        modeParam === 'timetrialHS' ? 'Zeit-High-Score' :
        modeParam === 'highscore' ? '6 Versuche-High-Score' : modeParam
      }</span></p>
      <p>Du hast <span className="font-semibold">{songs.length}</span> Fragen gespielt.</p>
      {effectiveMode === 'TimeTrial' && gesamtZeitFormatiert && (
        <p className="text-lg">Gesamtzeit: <span className="font-bold text-yellow-300">{gesamtZeitFormatiert}</span></p>
      )}
      <p className="text-2xl font-bold my-3">Dein Gesamtscore: <span className="text-yellow-400">{totalScore}</span></p>

      {songScores.length > 0 && (
        <div className="my-4 max-h-80 overflow-y-auto bg-gray-800 p-3 rounded-md shadow">
        <h3 className="text-lg font-semibold mb-2 text-blue-300">Detailauswertung:</h3>
        <ul className="space-y-2">
        {songScores.map((result, sIdx) => (
          <li key={result.songId || sIdx} className={`p-2 rounded-md text-left text-sm ${result.guessed ? 'bg-green-700 hover:bg-green-600' : (result.skippedOrDnf ? 'bg-yellow-700 hover:bg-yellow-600' : 'bg-red-700 hover:bg-red-600')}`}>
          <div className="flex justify-between items-center">
          <span className="font-medium truncate w-3/4" title={result.title}>{sIdx + 1}. {result.title}</span>
          <span className="font-bold">{result.score} Pkt.</span>
          </div>
          <div className="text-xs text-gray-300 mt-1">
          {result.guessed ? "Richtig!" : (result.skippedOrDnf ? "Übersprungen/DNF" : "Nicht geraten")}
          <span> (Versuche: {result.attemptsMade})</span>
          {result.timeTakenSeconds !== undefined && <span>, Zeit: {result.timeTakenSeconds}s</span>}
          </div>
          </li>
        ))}
        </ul>
        </div>
      )}
      {/* Nächster Schritt: Highscore-Speicherung implementieren.
        Wenn modeParam.includes('HS'), dann hier Button/Formular anzeigen.
        Beispiel: if (modeParam.includes('HS')) { <HighscoreSubmitForm results={quizResults} /> }
        */}
        <Button onClick={() => nav('/solo-config')} className="mt-4 w-full">Neues Solo-Quiz starten</Button>
        <Button onClick={() => nav('/')} variant="secondary" className="mt-2 w-full">Zurück zur Hauptseite</Button>
        </Card>
        </QuizLayout>
    );
  }

  const indColor = n => {
    if (solved && n === fails + 1) return 'bg-green-500 text-black';
    if (!solved && end && n <= fails +1 && attemptCount > FREEMODE_ATTEMPTS) return 'bg-red-600 text-black';
    if (n <= fails) return 'bg-red-600 text-black';
    if (n === attemptCount && !end && !solved) return 'bg-blue-500 text-black';
    return 'bg-gray-700 text-white';
  };

  const handleInputFocus = () => {
    if (effectiveMode === 'TimeTrial' && playing && !end && playerPauseRef.current) {
      playerPauseRef.current();
    }
  };

  if (!songs.length && !done) { // Ladezustand oder Fehler beim initialen Laden
    return (
      <QuizLayout>
      <Card className="text-center p-8">
      <p className="text-xl text-gray-400">{info || "Lade Quizdaten..."}</p>
      {info.startsWith("❌ Fehler Songs") && (
        <Button onClick={() => nav('/solo-config')} className="mt-6">Zurück zur Konfiguration</Button>
      )}
      </Card>
      </QuizLayout>
    );
  }

  return (
    <QuizLayout>
    <Card className="space-y-4 sm:space-y-6">
    <p className="text-center text-xs sm:text-sm text-gray-400">
    Kategorie: {catLabel} | Frage {idx + 1}/{songs.length} | Modus: {
      modeParam === 'timetrial' ? 'Zeittrennen' :
      modeParam === 'freemode' ? '6 Versuche' :
      modeParam === 'timetrialHS' ? 'Zeit-High-Score' :
      modeParam === 'highscore' ? '6 Versuche-High-Score' : modeParam
    } | Punkte: <span className="font-bold">{totalScore}</span>
    </p>

    {effectiveMode === 'Freemode' && (
      <div className="flex justify-center gap-1">
      {Array.from({ length: FREEMODE_ATTEMPTS }, (_, i) => i + 1).map(n => (
        <div key={n} className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-xs font-bold ${indColor(n)}`} title={`Versuch ${n}`}>{n}</div>
      ))}
      </div>
    )}

    {cur._id ? ( // Stelle sicher, dass cur und cur._id existieren
      <>
      <CustomAudioPlayer
      key={cur._id}
      src={`/audio/${cur.audioFile || ''}`}
      offset={cur.startTime ?? 0}
      maxSeek={effectiveMode === 'TimeTrial' ? maxSeek : undefined}
      onPlay={() => { console.log("[SoloQuiz] CustomAudioPlayer Event: onPlay"); setPlaying(true); }}
      onPause={() => { console.log("[SoloQuiz] CustomAudioPlayer Event: onPause"); setPlaying(false); }}
      onEnded={() => {
        console.log("[SoloQuiz] CustomAudioPlayer Event: onEnded - Song:", cur.title, "Frage beendet (end):", end, "Song gelöst (solved):", solved);
        setPlaying(false);
        if (!end) { // Nur handeln, wenn Frage nicht schon durch Raten/Skip beendet
          if (effectiveMode === 'TimeTrial' && !solved) {
            console.log("[SoloQuiz] TimeTrial Song zu Ende (onEnded), nicht gelöst -> werte als DNF");
            recordSongResult(cur, false, fails, true); // DNF
          } else if (effectiveMode === 'Freemode' && !solved && attemptCount >= FREEMODE_ATTEMPTS) {
            setInfo(`Lösung war: ${cur.title}`);
            recordSongResult(cur, false, FREEMODE_ATTEMPTS, false); // Max Versuche, nicht geraten
          }
        }
      }}
      onPosition={sec => { if (effectiveMode === 'TimeTrial' && !end && playing) setMaxSeek(p => Math.max(p, sec)); }}
      onExposePause={fn => playerPauseRef.current = fn}
      // Autoplay Logik:
      // Dein CustomAudioPlayer muss Autoplay unterstützen oder du musst .play() manuell aufrufen
      // z.B. in einem useEffect, wenn `playing` true ist und der Song sich ändert
      // useEffect(() => {
      //   if (playing && audioPlayerRef.current && cur._id && audioPlayerRef.current.src !== `/audio/${cur.audioFile}`) {
      //      // Ggf. muss der Player erst laden, bevor play() gerufen wird.
      //      // audioPlayerRef.current.play().catch(e => console.warn("Autoplay failed", e));
      //   }
      // }, [playing, cur._id, cur.audioFile]);
      />

      {effectiveMode === 'TimeTrial' && ( <p className="text-center text-xs sm:text-sm text-gray-400">⏱ {msToString(elapsed)} | Fehlversuche: {fails}</p> )}

      {shownTips.length > 0 && (
        <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-700 space-y-1 text-xs sm:text-sm">
        <h4 className="font-semibold text-blue-300 mb-1">Tipps:</h4>
        <ul className="list-disc list-inside text-gray-300">
        {shownTips.map((tip, tipIdx) => ( <li key={tipIdx} className="break-words">{tip}</li> ))}
        </ul>
        </div>
      )}

      {!end ? (
        <>
        <div className="relative mt-2">
        <Input
        value={guess}
        onChange={e => setGuess(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && guess.trim()) { e.preventDefault(); handleSubmitAttempt(false); } }}
        onFocus={handleInputFocus}
        placeholder="Songtitel eingeben"
        className="text-sm sm:text-base"
        disabled={end || (effectiveMode === 'TimeTrial' && solved)}
        />
        {sug.length > 0 && (
          <ul className="absolute w-full bg-gray-800 border border-gray-700 rounded-b max-h-32 sm:max-h-40 overflow-y-auto z-10 mt-1 text-xs sm:text-sm">
          {sug.map(t => (
            <li key={t} className="px-3 py-1 hover:bg-blue-600 cursor-pointer" onClick={() => { setGuess(t); setSug([]); }}>{t}</li>
          ))}
          </ul>
        )}
        </div>
        <div className="flex gap-2 mt-2">
        <Button
        onClick={() => handleSubmitAttempt(false)}
        disabled={!guess.trim() || end || (effectiveMode === 'TimeTrial' && solved)}
        className="flex-1 text-sm sm:text-base"
        >
        Raten
        </Button>
        <Button
        variant="secondary"
        onClick={() => handleSubmitAttempt(true)}
        disabled={end || (effectiveMode === 'TimeTrial' && solved)}
        className="flex-shrink-0 text-sm sm:text-base"
        >
        Überspringen
        </Button>
        </div>
        </>
      ) : !done ? (
        <Button onClick={handleNextSong} className="mt-4 w-full text-sm sm:text-base">
        {idx + 1 < songs.length ? "➡ Nächster Song" : "📊 Zum Ergebnis"}
        </Button>
      ) : null }

      {!done && cur._id && (
        <div className="mt-3 pt-3 border-t border-gray-600 text-center">
        <Button variant="warning" size="sm" onClick={openReportModal} className="text-xs">Problem mit diesem Song melden</Button>
        </div>
      )}

      {info && <p className="text-center font-semibold mt-3 text-sm sm:text-base break-words">{info}</p>}
      {hist.length > 0 && (
        <ul className="text-xs sm:text-sm space-y-1 max-h-20 sm:max-h-24 overflow-y-auto p-2 bg-gray-800 rounded mt-2 border border-gray-700">
        {hist.map((h, hIdx) => <li key={hIdx} className="break-words">{h}</li>)}
        </ul>
      )}
      </>
    ) : ( // Wird angezeigt, wenn cur._id nicht existiert (z.B. während Songs noch laden oder wenn Fehler)
    <p className="text-center text-gray-400 py-10">
    {songs.length === 0 && db.length > 0 && !catLabel.includes("Alle") && !done ? "Keine Songs für die gewählten Kategorien gefunden." :
      (songs.length === 0 && !done ? "Lade Songs für das Quiz..." : "")}
      </p>
    )}
    </Card>

    {showReportModal && cur._id && (
      <Modal onClose={closeReportModal}>
      <h3 className="text-lg font-semibold mb-4 text-blue-300">Problem mit aktuellem Song melden</h3>
      <div className="space-y-3">
      <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">Art des Problems:</label>
      {PROBLEM_TYPES.map(pt => (
        <div key={pt.value} className="flex items-center mb-1">
        <input type="radio" id={`problem-${pt.value}`} name="problemType" value={pt.value} checked={currentReportProblemType === pt.value} onChange={(e) => setCurrentReportProblemType(e.target.value)} className="h-4 w-4 text-blue-500 border-gray-500 focus:ring-blue-400 bg-gray-700"/>
        <label htmlFor={`problem-${pt.value}`} className="ml-2 block text-sm text-gray-200">{pt.label}</label>
        </div>
      ))}
      </div>
      <div>
      <label htmlFor="reportComment" className="block text-sm font-medium text-gray-300 mb-1">Optionaler Kommentar (max. 200 Zeichen):</label>
      <textarea id="reportComment" name="reportComment" rows="3" maxLength="200" value={currentReportComment} onChange={(e) => setCurrentReportComment(e.target.value)} className="w-full p-2 border border-gray-600 bg-gray-700 rounded text-white focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="z.B. Falsches Genre, Titel enthält Tippfehler..."/>
      </div>
      <p className="pt-2 text-xs text-gray-400 text-center">Tipp: Wenn der Song nicht abspielt oder fehlerhaft ist, melde das Problem und überspringe ihn anschließend im Quiz.</p>
      </div>
      {reportStatus && (<p className={`mt-3 text-sm text-center ${reportStatus.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{reportStatus}</p>)}
      <div className="mt-5 flex justify-end gap-3">
      <Button variant="secondary" onClick={closeReportModal}>Abbrechen</Button>
      <Button onClick={handleReportSubmit} disabled={!currentReportProblemType || reportStatus.startsWith('Sende')}>Senden</Button>
      </div>
      </Modal>
    )}
    </QuizLayout>
  );
}
