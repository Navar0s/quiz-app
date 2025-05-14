// src/SoloQuiz.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams }      from 'react-router-dom';
import { API }                              from './api';
import QuizLayout                           from './QuizLayout';
import Card                                 from './components/Card';
import Input                                from './components/Input';
import Button                               from './components/Button';
import CustomAudioPlayer                    from './components/CustomAudioPlayer';
import useStopwatch                         from './hooks/useStopwatch';
import Modal                                from './components/Modal';

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
  Musik: ['Album', 'Genre (Musik)', 'Künstler'],
  Sonstiges: ['Quelle', 'Jahr', 'Notizen']
};

const msToString = ms => {
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

  const mode         = params.get('mode') || 'freemode';
  const isTimeTrial  = mode.startsWith('timetrial');
  const isFreeMode   = !isTimeTrial;

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
  const [end, setEnd]         = useState(false); // Ob die aktuelle Frage beendet ist
  const [solved, setSol]      = useState(false);
  const [done, setDone]       = useState(false); // Ob das gesamte Quiz beendet ist
  const [results, setResults] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [maxSeek, setMaxSeek] = useState(0);
  const playerPauseRef        = useRef(()=>{});
  // States für Highscore Speicherung (später)
  // const [name, setName]       = useState('');
  // const [saved, setSaved]     = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReportProblemType, setCurrentReportProblemType] = useState('');
  const [currentReportComment, setCurrentReportComment] = useState('');
  const [reportStatus, setReportStatus] = useState('');

  // Stopwatch Logik
  const stopwatchActive = isTimeTrial && playing && !end;
  const [elapsed, resetSw]    = useStopwatch(stopwatchActive);

  // Log für Stopwatch-Bedingung bei Änderung
  useEffect(() => {
    console.log(`[SoloQuiz] Stopwatch Check - active: ${stopwatchActive}, isTimeTrial: ${isTimeTrial}, playing: ${playing}, end: ${end}`);
  }, [stopwatchActive, isTimeTrial, playing, end]);


  /* ---------- Songs laden ---------- */
  useEffect(() => {
    console.log("[SoloQuiz] useEffect[loadSongs]: Init. Modus:", mode, "Kategorien:", cats.join(', ') || "Alle", "Anzahl:", questionCnt);
    fetch(`${API}/songs`)
    .then(r => { if (!r.ok) throw new Error(`HTTP Fehler ${r.status}`); return r.json(); })
    .then(all => {
      if (!Array.isArray(all)) throw new Error("Empfangene Song-Daten sind kein Array");
      const filtered = cats.length===0 || cats.includes('Alle') ? all : all.filter(s => cats.includes(s.category));
      const songsWithReportField = filtered.map(s => ({ ...s, reportedIssues: s.reportedIssues || [] }));
      const finalQuizSongs = songsWithReportField.sort(()=>Math.random()-0.5).slice(0, questionCnt);
      setDb(all);
      setSongs(finalQuizSongs);
      console.log("[SoloQuiz] useEffect[loadSongs]: Quiz-Songs ausgewählt:", finalQuizSongs.length);

      // Reset States
      setIdx(0); setAttemptCount(1); setFails(0); setShownTips([]);
      setGuess(''); setSug([]); setHist([]); setInfo('');
      setEnd(false); setSol(false); setDone(false); setResults([]);
      resetSw(); setMaxSeek(0); setPlaying(false); // Wichtig: playing hier auf false
      setShowReportModal(false); setCurrentReportProblemType(''); setCurrentReportComment(''); setReportStatus('');
      console.log("[SoloQuiz] useEffect[loadSongs]: Alle relevanten States für Quizstart zurückgesetzt.");
    })
    .catch(err => { console.error("[SoloQuiz] Fehler beim Laden der Songs:", err); setInfo(`❌ Fehler Songs: ${err.message}`); setSongs([]); setDb([]); });
  }, [cats, questionCnt, mode]); // resetSw ist stabil, aber ESLint mag es hier

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
    // Zeige Suggestion nur, wenn die Eingabe nicht schon exakt einer Suggestion entspricht (case-insensitive)
    const exactMatchInSuggestions = list.some(item => normalizeText(item) === normalizedGuess);
    setSug(guess && list.length > 0 && !exactMatchInSuggestions ? list : []);
  }, [guess, db]);

  const cur = songs[idx] ?? {};

  const addHist = line => setHist(h => [line, ...h.slice(0, 4)]);

  const finishTimeTrialSong = (dnf = false, skipped = false) => {
    console.log(`[SoloQuiz] finishTimeTrialSong: song='${cur.title}', dnf=${dnf}, skipped=${skipped}, solved=${solved}, fails=${fails}, elapsed=${elapsed}`);
    const currentFailsForCalc = solved ? fails : fails + 1;
    const finalFails = dnf || skipped ? 10 : currentFailsForCalc;
    const finalTime = dnf || skipped ? (maxSeek * 1000 + 30000) : elapsed;
    setResults(r => [...r, { title: cur.title, time: finalTime, fails: finalFails, dnf: dnf || skipped }]);
    setEnd(true);
    setPlaying(false); // Wichtig
  };

  const revealNextTip = (currentFailsCount) => { // currentFailsCount ist der Wert von 'fails' *bevor* er für diesen Versuch inkrementiert wurde
    if (!cur.metadata || !cur.category) return;
    const categoryTipsOrder = tipOrder[cur.category];
    if (!categoryTipsOrder) return;

    // currentFailsCount ist 0-basiert für den Index der Tipps
    if (currentFailsCount < categoryTipsOrder.length) {
      const tipKey = categoryTipsOrder[currentFailsCount];
      const tipValue = cur.metadata[tipKey];
      if (tipValue) {
        const readableTipKey = tipKey.replace(/([A-Z])/g, ' $1').trim(); // Macht aus "Erscheinungsjahr" -> "Erscheinungsjahr"
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

  /* ---------- Submit-Logik ---------- */
  const handleSubmitAttempt = (isSkipped = false) => {
    console.log(`[SoloQuiz] handleSubmitAttempt aufgerufen - skipped: ${isSkipped}, guess: "${guess}", end: ${end}, solved (TimeTrial): ${isTimeTrial && solved}`);
    if (end || !cur._id ) { // Wenn Frage beendet oder kein aktueller Song, nichts tun
      console.log("[SoloQuiz] handleSubmitAttempt: Aktion blockiert (end oder kein cur._id).");
      return;
    }
    // Im TimeTrial, wenn bereits gelöst, keine weiteren Aktionen erlauben (außer nextSong)
    if (isTimeTrial && solved && !isSkipped) {
      console.log("[SoloQuiz] handleSubmitAttempt: TimeTrial bereits gelöst, keine erneute Bewertung.");
      return;
    }


    if (isSkipped) {
      addHist('⏭️ Übersprungen');
      setInfo(`Lösung war: ${cur.title}`);
      if (isTimeTrial) finishTimeTrialSong(false, true); else setEnd(true);
      return;
    }

    if (!guess.trim()) {
      console.log("[SoloQuiz] handleSubmitAttempt: Leere Eingabe, ignoriere.");
      return;
    }

    const normalizedGuess = normalizeText(guess);
    const normalizedTitle = normalizeText(cur.title);
    const normalizedAlts = Array.isArray(cur.alternativeTitles) ? cur.alternativeTitles.map(alt => normalizeText(alt)) : [];
    const isCorrect = normalizedTitle === normalizedGuess || normalizedAlts.includes(normalizedGuess);

    addHist(isCorrect ? `✅ ${guess}` : `❌ ${guess}`);

    if (isCorrect) {
      setInfo('🎉 Richtig!');
      setSol(true);
      if (isTimeTrial) finishTimeTrialSong(false, false); else setEnd(true);
    } else {
      revealNextTip(fails); // Tipp basierend auf der Anzahl der *bisherigen* Fehlversuche anzeigen
      const nextFails = fails + 1;
      setFails(nextFails);
      setGuess(''); // Eingabefeld leeren
      setSug([]);   // Vorschläge leeren

      if (isFreeMode) {
        const nextAttemptCount = attemptCount + 1;
        setAttemptCount(nextAttemptCount);
        if (nextAttemptCount > FREEMODE_ATTEMPTS) {
          setInfo(`Lösung war: ${cur.title}`);
          setEnd(true);
        } else {
          setInfo('Leider falsch...');
        }
      } else { // TimeTrial
        setInfo('Leider falsch...');
        // Im TimeTrial geht das Spiel für diesen Song weiter, 'fails' wird inkrementiert.
        // Der Song wird erst mit finishTimeTrialSong als beendet markiert (durch Raten, Skip oder DNF)
      }
    }
  };

  /* ---------- Nächster Song ---------- */
  const handleNextSong = () => {
    console.log("[SoloQuiz] handleNextSong aufgerufen. Aktueller Song idx:", idx, "end:", end);
    if (isTimeTrial && !end && cur._id) { // Wenn TimeTrial und aktueller Song nicht explizit beendet wurde
      console.log("[SoloQuiz] handleNextSong: TimeTrial Song nicht beendet, werte als DNF.");
      finishTimeTrialSong(true, false); // true für DNF
    }

    if (idx + 1 < songs.length) {
      setIdx(i => i + 1);
      // Reset für nächsten Song
      setAttemptCount(1); setFails(0); setShownTips([]);
      setGuess(''); setSug([]); setHist([]); setInfo('');
      setEnd(false); setSol(false); setPlaying(false); // Wichtig: playing hier auf false für neuen Song
      resetSw(); setMaxSeek(0);
      setCurrentReportProblemType(''); setCurrentReportComment(''); setReportStatus('');
      console.log("[SoloQuiz] handleNextSong: Nächster Song (Index", idx + 1, ") vorbereitet.");
    } else {
      console.log("[SoloQuiz] handleNextSong: Quiz beendet (done=true).");
      setDone(true);
      setPlaying(false); // Sicherstellen, dass Player am Ende aus ist
    }
  };

  /* ---------- Bug Report Funktionen ---------- */
  const openReportModal = () => {
    if (!cur._id) return;
    console.log("[SoloQuiz] openReportModal für Song:", cur.title);
    setReportStatus(''); setCurrentReportProblemType(PROBLEM_TYPES[0].value); setCurrentReportComment('');
    setShowReportModal(true);
    if(playing && playerPauseRef.current) {
      console.log("[SoloQuiz] Pausiere Player für Bug Report Modal.");
      playerPauseRef.current(); // Pausiert den CustomAudioPlayer
      // setPlaying(false); // Setze playing manuell, falls der Player das nicht schnell genug macht
    }
  };
  const closeReportModal = () => {
    console.log("[SoloQuiz] closeReportModal.");
    setShowReportModal(false);
    // Hier könnte man überlegen, den Player wieder zu starten, wenn er vorher lief und nicht 'end' ist.
    // Fürs Erste bleibt er pausiert, Nutzer muss manuell starten.
  };

  const handleReportSubmit = async () => {
    if (!cur._id || !currentReportProblemType) { setReportStatus('Fehler: Problemtyp auswählen.'); return; }
    console.log(`[SoloQuiz] Sende Bug Report: Typ='${currentReportProblemType}', Kommentar='${currentReportComment}'`);
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

  /* ---------- Render Ende Screen ---------- */
  if (done) {
    console.log("[SoloQuiz] Render End Screen. TimeTrial Results:", results);
    return (
      <QuizLayout>
      <Card className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-green-400">🎉 Quiz beendet!</h2>
      <p>Du hast {songs.length} Fragen gespielt.</p>
      {isTimeTrial && results.length > 0 && (
        <p className="text-sm text-gray-400">
        Zeitrennen abgeschlossen. Gesamtzeit: {msToString(results.reduce((sum, r) => sum + r.time, 0))}
        </p>
      )}
      {isFreeMode && (
        <p className="text-sm text-gray-400">6-Versuche-Modus abgeschlossen.</p>
      )}
      <Button onClick={() => nav('/solo-config')} className="mt-4 w-full">Neues Solo-Quiz starten</Button>
      <Button onClick={() => nav('/')} variant="secondary" className="mt-2 w-full">Zurück zur Hauptseite</Button>
      </Card>
      </QuizLayout>
    );
  }

  /* ---------- Versuchsbalken (Freemode) ---------- */
  const indColor = n => {
    if (solved && n === attemptCount) return 'bg-green-500 text-black';
    if (!solved && end && n <= fails) return 'bg-red-600 text-black'; // Alle Versuche aufgebraucht und falsch
    if (n <= fails && !end) return 'bg-red-600 text-black'; // Bisherige Fehlversuche
    if (n === attemptCount && !end) return 'bg-blue-500 text-black'; // Aktueller Versuch
    return 'bg-gray-700 text-white';
  };

  const handleInputFocus = () => { if (isTimeTrial && playing && playerPauseRef.current) { console.log("[SoloQuiz] Input focus, pausiere TimeTrial Player"); playerPauseRef.current(); }};

  // Konsolen-Log vor dem Haupt-Return, um wichtige States zu sehen
  // console.log(`[SoloQuiz] Render Main UI - idx: ${idx}, songId: ${cur._id}, playing: ${playing}, end: ${end}, done: ${done}`);

  return (
    <QuizLayout>
    <Card className="space-y-4 sm:space-y-6">
    <p className="text-center text-xs sm:text-sm text-gray-400">
    Kategorie: {catLabel} | Frage {idx + 1}/{songs.length} | Modus: {mode}
    </p>

    {isFreeMode && (
      <div className="flex justify-center gap-1">
      {Array.from({ length: FREEMODE_ATTEMPTS }, (_, i) => i + 1).map(n => (
        <div key={n} className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-xs font-bold ${indColor(n)}`} title={`Versuch ${n}`}>{n}</div>
      ))}
      </div>
    )}

    {songs.length > 0 && cur._id ? (
      <>
      <CustomAudioPlayer
      key={cur._id}
      src={cur.audio || ''}
      offset={cur.startTime ?? 0}
      maxSeek={isTimeTrial ? maxSeek : undefined}
      onPlay={() => { console.log("[SoloQuiz] CustomAudioPlayer Event: onPlay"); setPlaying(true); }}
      onPause={() => { console.log("[SoloQuiz] CustomAudioPlayer Event: onPause"); setPlaying(false); }}
      onEnded={() => {
        console.log("[SoloQuiz] CustomAudioPlayer Event: onEnded");
        setPlaying(false);
        if (isTimeTrial && !end && !solved) { // Wenn im TT Song zu Ende und noch nicht gelöst/beendet
          console.log("[SoloQuiz] TimeTrial Song zu Ende, nicht gelöst -> werte als DNF");
          finishTimeTrialSong(true, false); // DNF
        } else if (isFreeMode && !end && !solved && attemptCount > FREEMODE_ATTEMPTS) { // Freemode, alle Versuche aufgebraucht
          setInfo(`Lösung war: ${cur.title}`);
          setEnd(true);
        }
      }}
      onPosition={sec => { if (isTimeTrial && !end) setMaxSeek(p => Math.max(p, sec)); }}
      onExposePause={fn => playerPauseRef.current = fn}
      />

      {isTimeTrial && ( <p className="text-center text-xs sm:text-sm text-gray-400">⏱ {msToString(elapsed)} | Fehlversuche: {fails}</p> )}

      {shownTips.length > 0 && (
        <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-700 space-y-1 text-xs sm:text-sm">
        <h4 className="font-semibold text-blue-300 mb-1">Tipps:</h4>
        <ul className="list-disc list-inside text-gray-300">
        {shownTips.map((tip, index) => ( <li key={index} className="break-words">{tip}</li> ))}
        </ul>
        </div>
      )}

      {!end ? (
        <>
        <div className="relative mt-2">
        <Input
        value={guess}
        onChange={e => setGuess(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && guess.trim()) { handleSubmitAttempt(false); } }}
        onFocus={handleInputFocus}
        placeholder="Songtitel eingeben"
        className="text-sm sm:text-base"
        disabled={end || (isTimeTrial && solved)} // Deaktiviere Input, wenn Frage vorbei oder im TT gelöst
        />
        {sug.length > 0 && (
          <ul className="absolute w-full bg-gray-800 border border-gray-700 rounded-b max-h-32 sm:max-h-40 overflow-y-auto z-10 mt-1 text-xs sm:text-sm">
          {sug.map(t => (
            <li key={t} className="px-3 py-1 hover:bg-blue-600 cursor-pointer" onClick={() => { setGuess(t); setSug([]); }}>{t}</li>
          ))}
          </ul>
        )}
        </div>
        {/* BUTTON LAYOUT GEMÄSS SKIZZE */}
        <div className="flex gap-2 mt-2">
        <Button
        onClick={() => handleSubmitAttempt(false)}
        disabled={!guess.trim() || end || (isTimeTrial && solved)}
        className="flex-1 text-sm sm:text-base" // flex-1 (oder flex-grow)
      >
      Raten
      </Button>
      <Button
      variant="secondary"
      onClick={() => handleSubmitAttempt(true)}
      disabled={end || (isTimeTrial && solved)}
      className="flex-shrink-0 text-sm sm:text-base" // w-auto ist implizit, flex-shrink-0 ist wichtig
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
        {hist.map((h, i) => <li key={i} className="break-words">{h}</li>)}
        </ul>
      )}
      </>
    ) : (
      <p className="text-center text-gray-400 py-10">{songs.length === 0 && !catLabel.includes("Alle") ? "Keine Songs für die gewählten Kategorien gefunden." : "Lade Songs für das Quiz..."}</p>
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
