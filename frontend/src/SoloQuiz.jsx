// frontend/src/SoloQuiz.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams }      from 'react-router-dom';
import { API }                              from './api';
import QuizLayout                           from './QuizLayout';
import Card                                 from './components/Card';
import Input                                from './components/Input';
import Button                               from './components/Button';
import CustomAudioPlayer                    from './components/CustomAudioPlayer';
import useStopwatch                         from './hooks/useStopwatch';
import Modal                                from './components/Modal';
import { SCORE_CONFIG, metadataFieldsConfig, CATEGORIES as APP_CATEGORIES, HIGHSCORE_QUESTION_COUNTS } from './config/quizConfig'; // CATEGORIES umbenannt zu APP_CATEGORIES zur Vermeidung von Namenskonflikten, falls CATEGORIES lokal anders genutzt wird.

/* ---------- Konstanten ---------- */
const FREEMODE_ATTEMPTS = 6;
const TIP_COST = SCORE_CONFIG.TIP_COST;

const normalizeText = (text) => {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const tipOrder = {
  Filme: ['Erscheinungsjahr', 'Genre', 'Regie', 'Darsteller', 'Zitat'],
  Serien: ['StartEndjahr', 'Genre', 'Staffelanzahl', 'Handlungsort', 'Nebencharakter'],
  Games: ['Erscheinungsjahr', 'Genre', 'Plattform', 'Entwickler', 'Nebenfigur'],
  Musik: ['Album', 'Genre'],
  Sonstiges: ['Quelle', 'Jahr', 'Notizen']
};

const getMaxTipsForCategory = (category) => {
  if (tipOrder[category]) {
    return tipOrder[category].length;
  }
  return 0;
};

const msToString = ms => {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '00:00.0';
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
  const nav = useNavigate();
  const [params] = useSearchParams();

  // --- Von Parametern abgeleitete Werte (mit useMemo für Stabilität) ---
  const modeParam = params.get('mode') || 'timetrial'; // Default, falls kein Modus übergeben
  const isSurvivalMode = useMemo(() => modeParam === 'survival', [modeParam]);
  const isPracticeMode = useMemo(() => modeParam === 'practice', [modeParam]);

  const effectiveMode = useMemo(() => {
    if (modeParam === 'timetrial' || modeParam === 'timetrial_hs') return 'TimeTrial';
    if (modeParam === 'survival') return 'Freemode'; // Survival nutzt die Freemode Score-Engine
    if (isPracticeMode) return 'Practice'; // Eigener effectiveMode für Üben
    return 'Freemode'; // Fallback
  }, [modeParam, isPracticeMode]);

  const questionCntFromParams = useMemo(() => {
    const countParam = params.get('count');
    // Für Survival oder wenn count nicht gesetzt/ungültig ist und es kein Übungsmodus ist, der 0 erlaubt für "alle"
    if (isSurvivalMode || (!countParam && !isPracticeMode)) return 0; // 0 bedeutet "alle Songs" für Survival oder wenn nicht spezifiziert (außer Üben)
  const parsedCount = parseInt(countParam, 10);
    return isNaN(parsedCount) || parsedCount <= 0 ? (isPracticeMode ? 0 : 10) : parsedCount; // Default 10, außer Üben darf 0 haben
  }, [params, isSurvivalMode, isPracticeMode]);

  const categoriesFromParams = useMemo(() => params.getAll('categories'), [params]);
  const stableCategoriesKey = useMemo(() => [...categoriesFromParams].sort().join(','), [categoriesFromParams]);
  const catLabel = useMemo(() => {
    if (categoriesFromParams.length === 0 || (categoriesFromParams.length === 1 && categoriesFromParams[0] === 'Alle')) {
      return 'Alle Kategorien';
    }
    return categoriesFromParams.join(', ');
  }, [categoriesFromParams]);

  // --- State Hooks ---
  const [db, setDb] = useState([]);
  const [quizSongs, setQuizSongs] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(1);
  const [fails, setFails] = useState(0); // Fehlversuche pro Song
  const [shownTips, setShownTips] = useState([]);
  const [remainingTipsCount, setRemainingTipsCount] = useState(0);
  const [guess, setGuess] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [infoMessage, setInfoMessage] = useState('');
  const [isQuestionOver, setIsQuestionOver] = useState(false);
  const [isSongGuessed, setIsSongGuessed] = useState(false);
  const [isQuizOver, setIsQuizOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [maxSeek, setMaxSeek] = useState(0);
  const [songScores, setSongScores] = useState([]); // Ergebnisse pro Song
  const [totalScore, setTotalScore] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReportProblemType, setCurrentReportProblemType] = useState('');
  const [currentReportComment, setCurrentReportComment] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [scoreChangeFeedback, setScoreChangeFeedback] = useState({ points: 0, type: '', visible: false, key: 0 });
  const [isSongActivated, setIsSongActivated] = useState(false); // Für Tipp-Button-Aktivierung
  // States für Highscore-Eingabe
  const [playerName, setPlayerName] = useState('');
  const [isHighscoreSubmitted, setIsHighscoreSubmitted] = useState(false);
  const [highscoreStatusMessage, setHighscoreStatusMessage] = useState('');

  // --- Ref Hooks ---
  const playerPauseRef = useRef(()=>{});
  const audioPlayerRef = useRef(null);
  const songStartTimeRef = useRef(0); // Für TimeTrial Song-Zeitmessung (Beginn des aktuellen Abspielsegments)
  const accumulatedPlayedTimeMsRef = useRef(0); // Für TimeTrial: Bereits gespielte Zeit für aktuellen Song

  // --- Custom Hook für Stoppuhr (Gesamtzeit TimeTrial) ---
  // Stoppuhr ist nur aktiv, wenn es TimeTrial ist, gespielt wird, die Frage und das Quiz nicht vorbei sind.
  const stopwatchShouldBeActive =
  (effectiveMode === 'TimeTrial') &&
  isPlaying &&
  !isQuestionOver &&
  !isQuizOver;
  const [elapsedTime, resetStopwatch, startStopwatch, pauseStopwatch] = useStopwatch(stopwatchShouldBeActive);

  // --- useMemo Hooks für abgeleitete Werte und Endscreen-Statistiken ---
  const currentSong = useMemo(() => quizSongs[currentSongIndex] ?? {}, [quizSongs, currentSongIndex]);

  const maxPossibleScoreTimeTrial = useMemo(() => {
    if (effectiveMode === 'TimeTrial' && questionCntFromParams > 0) {
      return questionCntFromParams * SCORE_CONFIG.TimeTrial.BASE_POINTS_PER_SONG;
    }
    return 0;
  }, [effectiveMode, questionCntFromParams]); // SCORE_CONFIG ist konstant

  const actualMaxPossibleScoreSurvival = useMemo(() => {
    // Im Survival ist die max. Punktzahl die Anzahl der gespielten Songs * Max-Punkte/Song
    // Da songScores erst am Ende des jeweiligen Songs gefüllt wird, nehmen wir die Anzahl der bisherigen Einträge.
    if (modeParam === 'survival') { // Explizit für Survival
      // Wenn das Quiz noch läuft und noch kein Song gespielt wurde, ist es 0.
      // Wenn das Quiz vorbei ist, ist songScores.length die Anzahl der gespielten Songs.
      return songScores.length * SCORE_CONFIG.Freemode.MAX_POINTS_PER_SONG;
    }
    return 0;
  }, [modeParam, songScores]); // SCORE_CONFIG ist konstant

  const correctlyGuessedCount = useMemo(() => {
    return songScores.filter(s => s.guessed).length;
  }, [songScores]);

  const timeTrialStats = useMemo(() => {
    if (effectiveMode !== 'TimeTrial' || songScores.length === 0) {
      return { averageTimeMs: null, shortestTimeMs: null };
    }
    const guessedSongsTimes = songScores
    .filter(s => s.guessed && s.timeTakenMs !== undefined)
    .map(s => s.timeTakenMs);

    if (guessedSongsTimes.length === 0) {
      return { averageTimeMs: null, shortestTimeMs: null };
    }
    const totalTimeGuessedMs = guessedSongsTimes.reduce((sum, time) => sum + time, 0);
    return {
      averageTimeMs: totalTimeGuessedMs / guessedSongsTimes.length,
      shortestTimeMs: Math.min(...guessedSongsTimes)
    };
  }, [effectiveMode, songScores]);

  // --- useEffect Hooks ---

  // Schutz gegen versehentliches Verlassen der Seite
  useEffect(() => {
    const shouldActuallyBlock = () => !isQuizOver && quizSongs.length > 0 && currentSongIndex < quizSongs.length;
    const handleBeforeUnload = (event) => {
      if (shouldActuallyBlock()) {
        event.preventDefault();
        event.returnValue = ''; // Standard für die meisten Browser
        return ''; // Für einige ältere Browser
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isQuizOver, quizSongs, currentSongIndex]);

  // Log für Stopwatch-Aktivität (Debugging)
  useEffect(() => {
    console.log(`[SoloQuiz] Stopwatch Check - shouldBeActive: ${stopwatchShouldBeActive}`);
  }, [stopwatchShouldBeActive]);

  // Haupt-Effekt zum Laden der Songs und Initialisieren des Quiz
  useEffect(() => {
    let isMounted = true;
    console.log(`[SoloQuiz] useEffect[loadSongs] START. Key: "${stableCategoriesKey}", QntyParam: ${questionCntFromParams}, Mode: ${modeParam}, Practice: ${isPracticeMode}`);

    // Reset aller relevanten States für ein neues Quiz
    setQuizSongs([]);
    setCurrentSongIndex(0);
    setAttemptCount(1);
    setFails(0);
    setShownTips([]);
    setGuess('');
    setSuggestions([]);
    setHistory([]);
    setInfoMessage('Lade Songs...');
    setIsQuestionOver(false);
    setIsSongGuessed(false);
    setIsQuizOver(false);
    setSongScores([]);
    setTotalScore(0);
    setMaxSeek(0);
    setIsPlaying(false);
    setIsSongActivated(false);
    resetStopwatch(); // Gesamt-Stoppuhr zurücksetzen

    // Highscore-bezogene States zurücksetzen
    setIsHighscoreSubmitted(false);
    setHighscoreStatusMessage('');
    setPlayerName('');

    fetch(`${API}/songs`)
    .then(r => {
      if (!isMounted) throw new Error("Component unmounted before fetch completed");
      if (!r.ok) return r.text().then(text => { throw new Error(`HTTP ${r.status}: ${text}`); });
      return r.json();
    })
    .then(allSongsData => {
      if (!isMounted) return;
      if (!Array.isArray(allSongsData)) throw new Error("Bad data format from API");
      setDb(allSongsData);

      const currentCatsFilter = categoriesFromParams.length === 0 || (categoriesFromParams.length === 1 && categoriesFromParams[0] === 'Alle')
      ? () => true // Keine Filterung, wenn "Alle"
      : song => categoriesFromParams.includes(song.category);

      const filteredSongs = allSongsData.filter(currentCatsFilter);

      let songsToLoad = filteredSongs
      .map(s => ({ ...s, reportedIssues: s.reportedIssues || [] }))
      .sort(() => Math.random() - 0.5);

      // Frageanzahl berücksichtigen, außer für Survival (wo questionCntFromParams 0 ist)
      // und Übungsmodus, wenn questionCntFromParams 0 ist (bedeutet "alle")
      if (questionCntFromParams > 0) {
        songsToLoad = songsToLoad.slice(0, questionCntFromParams);
      }
      // Wenn im Übungsmodus questionCntFromParams 0 ist, werden alle geladen (kein slice)
      // Wenn Survival, ist questionCntFromParams bereits 0, also alle geladen

      if (songsToLoad.length === 0) {
        setInfoMessage("Keine Songs für diese Auswahl gefunden. Bitte ändere die Konfiguration.");
        setIsQuizOver(true);
        return;
      }

      setQuizSongs(songsToLoad);
      if (songsToLoad.length > 0 && songsToLoad[0].category) {
        setRemainingTipsCount(getMaxTipsForCategory(songsToLoad[0].category));
      } else {
        setRemainingTipsCount(0);
      }
      setInfoMessage(''); // Lade-Nachricht entfernen

      // Spezifische Initialisierung für TimeTrial Song-Zeitmessung
      if (effectiveMode === 'TimeTrial') {
        accumulatedPlayedTimeMsRef.current = 0;
        songStartTimeRef.current = 0;
      }
    })
    .catch(err => {
      if (!isMounted || err.message === "Component unmounted before fetch completed") {
        console.log("Song loading fetch aborted due to component unmount.");
        return;
      }
      console.error("[SoloQuiz] Fehler beim Laden der Songs:", err);
      setInfoMessage(`❌ Fehler beim Laden der Songs: ${err.message}`);
      setDb([]);
      setIsQuizOver(true);
    });

    return () => {
      isMounted = false;
      console.log("[SoloQuiz] useEffect[loadSongs] UNMOUNT/CLEANUP.");
    };
  }, [stableCategoriesKey, modeParam, questionCntFromParams, isPracticeMode, effectiveMode, API, params, resetStopwatch, categoriesFromParams]); // categoriesFromParams für currentCatsFilter hinzugefügt

  // Effekt für Autocomplete-Vorschläge
  useEffect(() => {
    if (!guess) {
      setSuggestions([]);
      return;
    }
    const normalizedGuess = normalizeText(guess);
    const newSuggestions = new Set();
    db.forEach(song => {
      if (song.title && normalizeText(song.title).includes(normalizedGuess)) {
        newSuggestions.add(song.title);
      }
      if (Array.isArray(song.alternativeTitles)) {
        song.alternativeTitles.forEach(alt => {
          if (alt && normalizeText(alt).includes(normalizedGuess)) {
            newSuggestions.add(song.title);
          }
        });
      }
    });
    const list = Array.from(newSuggestions).slice(0, 5);
    setSuggestions(guess && list.length > 0 && !list.some(item => normalizeText(item) === normalizedGuess) ? list : []);
  }, [guess, db]);

  // Effekt für TimeTrial Song-Zeitmessung (Start/Pause des Segments)
  useEffect(() => {
    if (effectiveMode === 'TimeTrial' && !isQuizOver && !isQuestionOver && currentSong._id) {
      if (isPlaying) {
        songStartTimeRef.current = Date.now(); // Merke Systemzeitpunkt des Segmentstarts
      } else { // Player wurde pausiert
        if (songStartTimeRef.current > 0) { // Nur wenn ein Segment aktiv war
          const playedDurationInThisSegment = Date.now() - songStartTimeRef.current;
          accumulatedPlayedTimeMsRef.current += playedDurationInThisSegment;
          songStartTimeRef.current = 0; // Signalisiert, dass aktuell kein Segment läuft und Zeit akkumuliert wurde
        }
      }
    }
  }, [isPlaying, currentSong._id, effectiveMode, isQuizOver, isQuestionOver]); // currentSongIndex nicht nötig, da currentSong._id sich ändert


  // Effekt bei Quiz-Ende (z.B. für Highscore-Logik oder Aufräumen)
  useEffect(() => {
    if (isQuizOver) {
      if (effectiveMode === 'TimeTrial' && stopwatchShouldBeActive) { // Sicherstellen, dass Stoppuhr pausiert wird
        pauseStopwatch();
      }
      // Hier könnte man z.B. Logik für das automatische Senden von Ergebnissen einfügen,
      // aber das machen wir jetzt über das Namensformular.
      const resultsForLog = {
        modeParam,
        effectiveMode,
        isPracticeMode,
        totalScore,
        songDetails: songScores,
        questionCount: quizSongs.length, // Tatsächliche Anzahl gespielter Songs
        quizTimestamp: new Date().toISOString(),
            ...(effectiveMode === 'TimeTrial' && { totalTimeMs: elapsedTime, totalTimeFormatted: msToString(elapsedTime) })
      };
      console.log("FINALE QUIZ ERGEBNISSE (für Logging):", resultsForLog);
    }
  }, [isQuizOver, effectiveMode, modeParam, isPracticeMode, totalScore, songScores, quizSongs.length, elapsedTime, pauseStopwatch, stopwatchShouldBeActive, nav]); // nav entfernt, da hier nicht direkt navigiert wird
  // --- useCallback Hooks für Funktionen ---

  const addHistoryEntry = useCallback(
    (line) => setHistory(h => [line, ...h.slice(0, 4)]), // Nur die letzten 5 Einträge behalten
                                      []
  );

  const calculateFreemodeScore = useCallback(
    (numIncorrectAttempts, tipsBoughtCount) => {
      // Diese Funktion ist nur für Survival relevant (effectiveMode === 'Freemode')
      let score = SCORE_CONFIG.Freemode.MAX_POINTS_PER_SONG;
      score -= (numIncorrectAttempts * SCORE_CONFIG.Freemode.DEDUCTION_PER_WRONG_ATTEMPT);
      score -= (tipsBoughtCount * TIP_COST);
      return Math.max(0, score);
    },
    [] // TIP_COST und SCORE_CONFIG sind konstant
  );

  const calculateTimeTrialScore = useCallback(
    (timeTakenMs, numIncorrectAttempts, tipsBoughtCount) => {
      const timeTakenSeconds = Math.round(timeTakenMs / 1000);
      let score = SCORE_CONFIG.TimeTrial.BASE_POINTS_PER_SONG;
      score -= (timeTakenSeconds * SCORE_CONFIG.TimeTrial.TIME_DEDUCTION_PER_SECOND);
      score -= (numIncorrectAttempts * SCORE_CONFIG.TimeTrial.WRONG_ATTEMPT_DEDUCTION);
      score -= (tipsBoughtCount * TIP_COST);
      return Math.max(0, score);
    },
    [] // TIP_COST und SCORE_CONFIG sind konstant
  );

  const recordSongResult = useCallback(
    (songData, guessed, numIncorrectAttemptsForSong, skippedOrDnf = false) => {
      if (!songData || !songData._id) {
        console.warn("[SoloQuiz] recordSongResult: Ungültige songData.");
        return;
      }

      let currentSongScore = 0;
      let timeTakenForCurrentSongMs = 0;
      const tipsBoughtForThisSong = shownTips.length;

      if (!isPracticeMode) { // Keine Punkte im Übungsmodus
        if (effectiveMode === 'Freemode') { // Survival
          currentSongScore = guessed ? calculateFreemodeScore(numIncorrectAttemptsForSong, tipsBoughtForThisSong) : 0;
        } else if (effectiveMode === 'TimeTrial') {
          let finalSongTimeMs = accumulatedPlayedTimeMsRef.current;
          // Wenn der Song gerade lief, als das Ergebnis getriggert wurde, die aktuelle Segmentzeit addieren
          if (isPlaying && songStartTimeRef.current > 0) {
            finalSongTimeMs += (Date.now() - songStartTimeRef.current);
            songStartTimeRef.current = 0; // Segment beendet
          }
          timeTakenForCurrentSongMs = Math.max(0, finalSongTimeMs);

          if (skippedOrDnf) {
            currentSongScore = 0;
          } else {
            currentSongScore = calculateTimeTrialScore(timeTakenForCurrentSongMs, numIncorrectAttemptsForSong, tipsBoughtForThisSong);
          }
        }
      }

      const newSongScoreEntry = {
        songId: songData._id,
        title: songData.title,
        score: currentSongScore,
        guessed,
        attemptsMade: numIncorrectAttemptsForSong + (guessed ? 1 : 0),
                                       tipsBought: tipsBoughtForThisSong,
                                       skippedOrDnf,
                                       ...(effectiveMode === 'TimeTrial' && { timeTakenMs: timeTakenForCurrentSongMs, timeTakenSeconds: Math.round(timeTakenForCurrentSongMs / 1000) })
      };

      setSongScores(prev => [...prev, newSongScoreEntry]);

      if (!isPracticeMode) {
        setTotalScore(prev => prev + currentSongScore);
        // Score-Feedback Pop-up
        const feedbackConditionMet = (currentSongScore !== 0 || !guessed || skippedOrDnf);
        if (feedbackConditionMet) {
          const feedbackData = {
            points: currentSongScore,
            type: guessed ? 'songCorrect' : 'songIncorrectOrSkipped',
            visible: true,
            key: Date.now()
          };
          setScoreChangeFeedback(feedbackData);
          setTimeout(() => {
            setScoreChangeFeedback(prev => (prev.key === feedbackData.key ? { ...prev, visible: false } : prev));
          }, 2000);
        }
      }

      setIsQuestionOver(true);
      if (isPlaying) { // Sicherstellen, dass der Player stoppt und die Zeitmessung für das Segment korrekt ist
        if (playerPauseRef.current) playerPauseRef.current(); // Pausiert den Player
        // setIsPlaying(false) wird durch onPause des Players getriggert, was dann auch useEffect für TimeTrial Song-Zeit auslöst
      }
    },
    [
      isPracticeMode, effectiveMode, isPlaying, // isPlaying hier wichtig für die korrekte Zeitnahme im TimeTrial
      shownTips.length,
      calculateFreemodeScore, calculateTimeTrialScore,
      // songStartTimeRef und accumulatedPlayedTimeMsRef sind Refs
    ]
  );

  const handleBuyTip = useCallback(() => {
    if (remainingTipsCount === 0 || isQuestionOver || !currentSong || !currentSong.category || !isSongActivated) {
      return;
    }

    if (!isPracticeMode) {
      setScoreChangeFeedback({
        points: -TIP_COST, // Zeigt dem User die Kosten an
        type: 'tipBought',
        visible: true,
        key: Date.now()
      });
      setTimeout(() => {
        setScoreChangeFeedback(prev => (prev.key === scoreChangeFeedback.key ? { ...prev, visible: false } : prev));
      }, 2000);
    }

    const category = currentSong.category;
    const tipsForCategory = tipOrder[category];
    if (!tipsForCategory) return;

    const nextTipIndex = shownTips.length;
    if (nextTipIndex < tipsForCategory.length) {
      const tipKey = tipsForCategory[nextTipIndex];
      const tipText = getTipText(tipKey, currentSong, category); // getTipText ist eine Hilfsfunktion (kommt später)
  setShownTips(prevTips => [...prevTips, tipText]);
  setRemainingTipsCount(prevCount => prevCount - 1);
    }
  }, [
    remainingTipsCount, isQuestionOver, currentSong, isSongActivated,
    isPracticeMode, shownTips.length, scoreChangeFeedback.key // scoreChangeFeedback.key für den Timeout Clear
    // TIP_COST ist konstant
  ]);

  const handleSubmitAttempt = useCallback(
    (isSkipped = false) => {
      if (isQuestionOver || !currentSong._id) return;

      if (isSkipped) {
        addHistoryEntry('⏭️ Übersprungen');
        setInfoMessage(`Lösung war: ${currentSong.title}`);
        recordSongResult(currentSong, false, fails, true);
        if (modeParam === 'survival') {
          setIsQuizOver(true); // Nur im Survival bei Skip das Quiz beenden
        }
        return;
      }

      if (!guess.trim()) return;
      const normalizedPlayerAnswer = normalizeText(guess);
      const mainTitleNormalized = normalizeText(currentSong.title);
      const altTitlesNormalized = (currentSong.alternativeTitles || []).map(alt => normalizeText(alt));
      const isCorrect = mainTitleNormalized === normalizedPlayerAnswer || altTitlesNormalized.includes(normalizedPlayerAnswer);

      addHistoryEntry(isCorrect ? `✅ ${guess}` : `❌ ${guess}`);
      setGuess('');
      setSuggestions([]);

      if (isCorrect) {
        setInfoMessage('🎉 Richtig!');
        setIsSongGuessed(true);
        recordSongResult(currentSong, true, fails, false);
      } else { // Antwort ist falsch
        const newFails = fails + 1;
        setFails(newFails);

        if (isPracticeMode) {
          setInfoMessage('Leider falsch... Versuch es nochmal!');
        } else if (modeParam === 'survival') {
          const nextAttempt = attemptCount + 1;
          setAttemptCount(nextAttempt);
          if (nextAttempt > FREEMODE_ATTEMPTS) {
            setInfoMessage(`Lösung war: ${currentSong.title}`);
            recordSongResult(currentSong, false, FREEMODE_ATTEMPTS, false);
            setIsQuizOver(true);
          } else {
            setInfoMessage('Leider falsch...');
          }
        } else { // TimeTrial & TimeTrial_HS
          setInfoMessage('Leider falsch...');
        }
      }
    },
    [
      isQuestionOver, currentSong, guess, fails, modeParam, isPracticeMode,
      attemptCount, addHistoryEntry, recordSongResult
      // FREEMODE_ATTEMPTS ist konstant
    ]
  );

  const handleNextSong = useCallback(() => {
    if (currentSongIndex + 1 < quizSongs.length) {
      const nextSongIndex = currentSongIndex + 1;
      const nextSong = quizSongs[nextSongIndex];

      setCurrentSongIndex(nextSongIndex);
      setAttemptCount(1);
      setFails(0);
      setShownTips([]);
      setGuess('');
      setSuggestions([]);
      setHistory([]);
      setInfoMessage('');
      setIsQuestionOver(false);
      setIsSongGuessed(false);
      setIsPlaying(false);
      if (playerPauseRef.current) playerPauseRef.current();
      setIsSongActivated(false);
      setMaxSeek(0);

      // Tipps für nächsten Song setzen
      if (nextSong && nextSong.category) {
        setRemainingTipsCount(getMaxTipsForCategory(nextSong.category));
      } else {
        setRemainingTipsCount(0);
      }

      // TimeTrial Song-Zeitmessung zurücksetzen
      if (effectiveMode === 'TimeTrial') {
        accumulatedPlayedTimeMsRef.current = 0;
        songStartTimeRef.current = 0;
      }
      // Report-Modal States zurücksetzen (falls es offen war)
      // setShowReportModal(false); // Wird durch closeReportModal oder Submit gehandhabt
      setCurrentReportProblemType('');
      setCurrentReportComment('');
      setReportStatus('');
    } else { // Letzter Song wurde gespielt
      setIsQuizOver(true);
      if (isPlaying) setIsPlaying(false);
      if (playerPauseRef.current) playerPauseRef.current();
    }
  }, [currentSongIndex, quizSongs, effectiveMode]); // Andere States werden gesetzt, sind keine Deps für den Callback selbst

  // --- Highscore Senden Funktion ---
  const handleSubmitHighscore = async () => {
    if (!playerName.trim()) {
      setHighscoreStatusMessage('Fehler: Bitte gib einen Namen ein.');
      return;
    }
    setHighscoreStatusMessage('Sende Highscore...');

    const isMixedCategory = categoriesFromParams.length === 0 ||
    (categoriesFromParams.length === 1 && categoriesFromParams[0] === 'Alle');

    let categoryForDb;
    if (isMixedCategory) {
      categoryForDb = "mixed";
    } else if (categoriesFromParams.length === 1) {
      categoryForDb = categoriesFromParams[0];
    } else {
      // Fallback, sollte für HS-Modi nicht eintreten
      categoryForDb = categoriesFromParams.join('_');
      console.warn("Mehrere spezifische Kategorien für Highscore-Modus erkannt:", categoriesFromParams);
    }

    const highscoreEntry = {
      playerName: playerName.trim(),
      score: totalScore,
      timestamp: new Date().toISOString(), // Wird vom Backend überschrieben, aber gut es hier zu haben
      category: categoryForDb,
      ...(modeParam === 'timetrial_hs' && {
        totalTimeMs: elapsedTime,
        totalTimeFormatted: msToString(elapsedTime),
          questionCount: questionCntFromParams,
          correctlyGuessed: correctlyGuessedCount,
      }),
      ...(modeParam === 'survival' && {
        songsCleared: correctlyGuessedCount,
      }),
    };

    console.log("Sende Highscore-Eintrag:", highscoreEntry);

    try {
      const apiMode = modeParam;
      const response = await fetch(`${API}/highscores/${apiMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(highscoreEntry),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unbekannter Serverfehler beim Verarbeiten der Antwort.' }));
        throw new Error(errorData.message || `Serverfehler: ${response.status}`);
      }
      const result = await response.json();
      setHighscoreStatusMessage(result.message || 'Highscore erfolgreich eingetragen!');
      setIsHighscoreSubmitted(true);
    } catch (error) {
      console.error("Fehler beim Senden des Highscores:", error);
      setHighscoreStatusMessage(`Fehler beim Senden: ${error.message}`);
    }
  }; // Ende handleSubmitHighscore (kann useCallback werden, wenn nötig)

  // --- Weitere Hilfsfunktionen ---

  // getTipText wird von handleBuyTip verwendet
  const getTipText = (tipKey, songData, categoryForConfig) => {
    if (!songData || !songData.metadata) return 'Tipp-Information nicht verfügbar.';
    const metadata = songData.metadata;

    if (tipKey === 'StartEndjahr') {
      const start = metadata.Startjahr !== undefined && metadata.Startjahr !== null ? metadata.Startjahr : 'N/A';
      const end = metadata.Endjahr !== undefined && metadata.Endjahr !== null && metadata.Endjahr !== '' ? metadata.Endjahr : 'laufend';
      const fieldConfig = metadataFieldsConfig[categoryForConfig]?.find(f => f.key === 'Startjahr');
      const readableTipKey = fieldConfig ? "Zeitraum (Serie)" : "Zeitraum";
      return `${readableTipKey}: ${start} - ${end}`;
    }

    const fieldConfig = metadataFieldsConfig[categoryForConfig]?.find(f => f.key === tipKey);
    const readableTipKey = fieldConfig ? fieldConfig.label : tipKey.replace(/([A-Z])/g, ' $1').trim();
    const tipValue = metadata[tipKey];
    return `${readableTipKey}: ${tipValue !== undefined && tipValue !== null && tipValue !== '' ? tipValue : 'N/A'}`;
  };

  // Callbacks für das "Problem melden"-Modal
  const openReportModal = useCallback(() => {
    if (!currentSong._id) return;
    setReportStatus('');
    setCurrentReportProblemType(PROBLEM_TYPES[0].value); // Default Problemtyp
    setCurrentReportComment('');
    setShowReportModal(true);
    if (isPlaying && playerPauseRef.current) playerPauseRef.current(); // Musik pausieren
  }, [currentSong._id, isPlaying]); // PROBLEM_TYPES ist konstant

  const closeReportModal = useCallback(() => {
    setShowReportModal(false);
  }, []);

  const handleReportSubmit = useCallback(async () => {
    if (!currentSong._id || !currentReportProblemType) {
      setReportStatus('Fehler: Problemtyp auswählen.');
      return;
    }
    setReportStatus('Sende Meldung...');
    try {
      const response = await fetch(`${API}/songs/${currentSong._id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemType: currentReportProblemType, comment: currentReportComment }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Unbekannter Serverfehler" }));
        throw new Error(errData.error || `Serverfehler ${response.status}`);
      }
      setReportStatus('✅ Meldung gesendet!');
      setTimeout(closeReportModal, 2000);
    } catch (e) {
      setReportStatus(`❌ Fehler: ${e.message}`);
    }
  }, [currentSong._id, currentReportProblemType, currentReportComment, API, closeReportModal]);

  // Für die farbliche Markierung der Versuchs-Kästchen im Survival-Modus
  const freemodeAttemptIndicatorColor = useCallback(
    (n) => {
      if (isSongGuessed && n === fails + 1) return 'bg-green-500 text-black';
      if (!isSongGuessed && isQuestionOver && n <= fails + 1 && attemptCount > FREEMODE_ATTEMPTS) return 'bg-red-600 text-black';
      if (n <= fails) return 'bg-red-600 text-black';
      if (n === attemptCount && !isQuestionOver && !isSongGuessed) return 'bg-blue-500 text-black';
      return 'bg-gray-700 text-white';
    },
    [isSongGuessed, isQuestionOver, fails, attemptCount]
  );

  // Player pausieren, wenn Input-Feld im TimeTrial fokussiert wird
  const handleInputFocus = useCallback(() => {
    if (effectiveMode === 'TimeTrial' && isPlaying && !isQuestionOver && playerPauseRef.current) {
      playerPauseRef.current();
    }
  }, [effectiveMode, isPlaying, isQuestionOver]);

  // State und Effekt für die Live-Anzeige der Song-Zeit im TimeTrial
  const [liveSongDisplayTime, setLiveSongDisplayTime] = useState(0);
  useEffect(() => {
    let animationFrameId;
    if (effectiveMode === 'TimeTrial' && isPlaying && !isQuizOver && !isQuestionOver && songStartTimeRef.current > 0) {
      const updateDisplayTime = () => {
        const currentSegmentDuration = Date.now() - songStartTimeRef.current;
        setLiveSongDisplayTime(accumulatedPlayedTimeMsRef.current + currentSegmentDuration);
        animationFrameId = requestAnimationFrame(updateDisplayTime);
      };
      animationFrameId = requestAnimationFrame(updateDisplayTime);
    } else if (effectiveMode === 'TimeTrial' && !isPlaying) {
      setLiveSongDisplayTime(accumulatedPlayedTimeMsRef.current); // Zeige akkumulierte Zeit bei Pause
    } else if (effectiveMode !== 'TimeTrial') {
      setLiveSongDisplayTime(0); // Für andere Modi immer 0
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [effectiveMode, isPlaying, isQuizOver, isQuestionOver]); // Keine direkte Abhängigkeit von Refs hier

  // --- JSX RENDER LOGIK BEGINNT HIER ---

  // 1. Fall: Quiz ist vorbei (isQuizOver === true)
  if (isQuizOver) {
    const showHighscoreForm =
    (modeParam === 'timetrial_hs' || modeParam === 'survival') &&
    !isHighscoreSubmitted;

    if (showHighscoreForm) {
      // --- FORMULAR ZUR NAMENSEINGABE ANZEIGEN ---
      return (
        <QuizLayout>
        <Card className="space-y-6 text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-yellow-400">🏆 Highscore! 🏆</h2>
        {modeParam === 'survival' ? (
          <p className="text-lg">
          Du hast <span className="font-semibold text-xl text-green-300">{correctlyGuessedCount}</span> Songs geschafft mit <span className="font-semibold text-xl text-yellow-300">{totalScore}</span> Punkten!
          </p>
        ) : ( // timetrial_hs
        <p className="text-lg">
        Dein Score: <span className="font-semibold text-xl text-yellow-300">{totalScore}</span> Punkte
        in <span className="font-semibold text-xl text-blue-300">{msToString(elapsedTime)}</span>!
        <span className="block text-sm text-gray-400">({correctlyGuessedCount} / {questionCntFromParams} richtig)</span>
        </p>
        )}
        <div className="w-full max-w-sm mx-auto pt-2">
        <label htmlFor="playerNameInput" className="block text-sm font-medium text-gray-300 mb-1">
        Trage deinen Namen für die Highscore-Liste ein (max. 15 Zeichen):
        </label>
        <Input
        type="text"
        id="playerNameInput"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
        placeholder="Dein Name"
        className="w-full text-center py-2.5 text-lg"
        maxLength={15}
        autoFocus
        />
        </div>
        {highscoreStatusMessage && (
          <p className={`text-sm mt-3 font-semibold ${highscoreStatusMessage.startsWith('Fehler') ? 'text-red-400' : 'text-green-400'}`}>
          {highscoreStatusMessage}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
        <Button
        onClick={handleSubmitHighscore}
        disabled={!playerName.trim() || highscoreStatusMessage.startsWith('Sende Highscore...')}
        className="flex-1 py-3 text-base"
        >
        {highscoreStatusMessage.startsWith('Sende Highscore...') ? 'Sende...' : 'Highscore eintragen'}
        </Button>
        <Button
        variant="secondary"
        onClick={() => {
          setIsHighscoreSubmitted(true);
          setHighscoreStatusMessage('');
        }}
        className="flex-1 py-3 text-base"
        disabled={highscoreStatusMessage.startsWith('Sende Highscore...')}
        >
        Nicht eintragen
        </Button>
        </div>
        <p className="text-xs text-gray-500 pt-2">
        Die Top-Scores werden im Backend verwaltet.
        </p>
        </Card>
        </QuizLayout>
      );
    } else { // Normale Endscreens (Üben oder nachdem Highscore gesendet/übersprungen wurde)
      if (isPracticeMode) {
        // --- ENDSCREEN FÜR ÜBUNGSMODUS ---
        return (
          <QuizLayout>
          <Card className="space-y-6 text-center">
          <h2 className="text-2xl font-bold text-green-400">🏁 Übungsrunde beendet!</h2>
          <p>
          Du hast <span className="font-semibold">{correctlyGuessedCount}</span> von <span className="font-semibold">{quizSongs.length}</span> Songs richtig geraten.
          </p>
          <p>Modus: <span className="font-semibold">Üben</span></p>
          {songScores.length > 0 && (
            <div className="my-4 max-h-60 sm:max-h-80 overflow-y-auto bg-gray-800 p-3 rounded-md shadow ring-1 ring-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-blue-300 sticky top-0 bg-gray-800 py-1 z-10">
            Gespielte Songs:
            </h3>
            <ul className="space-y-2 pt-1">
            {songScores.map((result, sIdx) => (
              <li key={result.songId || sIdx} className={`p-2.5 rounded-md text-left text-sm shadow-sm
                ${result.guessed ? 'bg-green-700 bg-opacity-50 hover:bg-opacity-75' : (result.skippedOrDnf ? 'bg-yellow-600 bg-opacity-50 hover:bg-opacity-65' : 'bg-red-700 bg-opacity-50 hover:bg-opacity-65')}
                `}>
                <div className="flex justify-between items-center">
                <span className="font-medium truncate w-3/4" title={result.title}>
                {sIdx + 1}. {result.title}
                </span>
                <span className={`font-bold text-xs px-2 py-0.5 rounded-full
                  ${result.guessed ? 'bg-green-500 text-green-900' : (result.skippedOrDnf ? 'bg-yellow-500 text-yellow-900' : 'bg-red-500 text-red-900')}
                  `}>
                  {result.guessed ? "RICHTIG" : (result.skippedOrDnf ? "ÜBERSPRUNGEN" : "FALSCH")}
                  </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1 pl-1">
                  Versuche benötigt: {result.attemptsMade}
                  {result.tipsBought > 0 && `, Tipps genutzt: ${result.tipsBought}`}
                  </div>
                  </li>
            ))}
            </ul>
            </div>
          )}
          <Button onClick={() => nav('/solo-config')} className="mt-4 w-full py-3">Neue Übungsrunde starten</Button>
          <Button onClick={() => nav('/')} variant="secondary" className="mt-2 w-full py-3">Zurück zur Hauptseite</Button>
          </Card>
          </QuizLayout>
        );
      } else {
        // --- ENDSCREEN FÜR SURVIVAL / TIMETRIAL (NICHT-ÜBEN, NACH HS-FORMULAR) ---
        const gesamtZeitFormatiert = effectiveMode === 'TimeTrial' ? msToString(elapsedTime) : null;
        let displayModeName = modeParam;
        if (effectiveMode === 'Freemode') { displayModeName = "Survival"; }
        else if (effectiveMode === 'TimeTrial') { displayModeName = modeParam === 'timetrial_hs' ? "Zeit-High-Score" : "Zeittrennen"; }

        return (
          <QuizLayout>
          <Card className="space-y-6 text-center">
          <h2 className="text-2xl font-bold text-green-400">🎉 Quiz beendet!</h2>
          <p>Modus: <span className="font-semibold">{displayModeName}</span></p>
          {effectiveMode === 'Freemode' ? (
            <>
            <p>Du hast <span className="font-semibold">{correctlyGuessedCount}</span> Songs in Folge richtig beantwortet!</p>
            {songScores.length > 0 && !songScores[songScores.length - 1].guessed && (
              <>
              {songScores[songScores.length - 1].skippedOrDnf ? (
                <p className="text-sm text-yellow-500 mt-1">Das Quiz endete, da der letzte Song übersprungen wurde.</p>
              ) : (
                <p className="text-sm text-red-400 mt-1">Das Quiz endete, da der letzte Song nicht innerhalb von {FREEMODE_ATTEMPTS} Versuchen gelöst wurde.</p>
              )}
              </>
            )}
            </>
          ) : ( // TimeTrial und TimeTrial_HS
          <p>Du hast <span className="font-semibold">{correctlyGuessedCount} / {questionCntFromParams > 0 ? questionCntFromParams : quizSongs.length}</span> Fragen richtig beantwortet.</p>
          )}
          {effectiveMode === 'TimeTrial' && gesamtZeitFormatiert && (
            <div className="mt-2 space-y-1">
            <p className="text-lg">Gesamtzeit: <span className="font-bold text-yellow-300">{gesamtZeitFormatiert}</span></p>
            {timeTrialStats.averageTimeMs !== null && (
              <p className="text-md">Ø Zeit pro richtigem Song: <span className="font-semibold">{msToString(timeTrialStats.averageTimeMs)}</span></p>
            )}
            {timeTrialStats.shortestTimeMs !== null && (
              <p className="text-md">Schnellster Song: <span className="font-semibold">{msToString(timeTrialStats.shortestTimeMs)}</span></p>
            )}
            </div>
          )}
          <p className="text-2xl font-bold my-3">
          Dein Gesamtscore: <span className="text-yellow-400">{totalScore}</span>
          {effectiveMode === 'Freemode' && actualMaxPossibleScoreSurvival > 0 && ` / ${actualMaxPossibleScoreSurvival} Pkt.`}
          {effectiveMode === 'TimeTrial' && maxPossibleScoreTimeTrial > 0 && ` / ${maxPossibleScoreTimeTrial} Pkt.`}
          </p>
          {songScores.length > 0 && (
            <div className="my-4 max-h-60 sm:max-h-80 overflow-y-auto bg-gray-800 p-3 rounded-md shadow ring-1 ring-gray-700">
            <h3 className="text-lg font-semibold mb-2 text-blue-300 sticky top-0 bg-gray-800 py-1 z-10">
            Detailauswertung:
            </h3>
            <ul className="space-y-2 pt-1">
            {songScores.map((result, sIdx) => (
              <li key={result.songId || sIdx} className={`p-2.5 rounded-md text-left text-sm shadow-sm
                ${result.guessed ? 'bg-green-700 bg-opacity-50 hover:bg-opacity-75' : (result.skippedOrDnf ? 'bg-yellow-600 bg-opacity-50 hover:bg-opacity-65' : 'bg-red-700 bg-opacity-50 hover:bg-opacity-65')}
                `}>
                <div className="flex justify-between items-center">
                <span className="font-medium truncate w-3/4" title={result.title}>
                {sIdx + 1}. {result.title}
                </span>
                <span className="font-bold">{result.score} Pkt.</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 pl-1">
                {result.guessed ? "Richtig!" : (result.skippedOrDnf ? "Übersprungen/DNF" : "Nicht geraten")}
                <span> (Versuche: {result.attemptsMade})</span>
                {typeof result.tipsBought === 'number' && result.tipsBought > 0 && <span>, Tipps: {result.tipsBought}</span>}
                {result.guessed && result.timeTakenMs !== undefined && <span>, Zeit: {msToString(result.timeTakenMs)}</span>}
                {!result.guessed && effectiveMode === 'TimeTrial' && result.timeTakenMs !== undefined && <span>, Zeit: N/A (nicht geraten)</span>}
                </div>
                </li>
            ))}
            </ul>
            </div>
          )}
          <Button onClick={() => nav('/solo-config')} className="mt-4 w-full py-3">Neues Solo-Quiz starten</Button>
          <Button onClick={() => nav('/')} variant="secondary" className="mt-2 w-full py-3">Zurück zur Hauptseite</Button>
          </Card>
          </QuizLayout>
        );
      }
    }
  } // Ende von if (isQuizOver)

  // 2. Fall: Quiz lädt noch oder es gab einen Fehler beim Laden der Songs, aber Quiz ist nicht "beendet" im Sinne von durchgespielt
  if (!quizSongs.length || (!currentSong._id && !isQuizOver)) {
    return (
      <QuizLayout>
      <Card className="text-center p-8">
      <p className="text-xl text-gray-400">{infoMessage || "Lade Quizdaten..."}</p>
      {(infoMessage.startsWith("❌ Fehler") || infoMessage.startsWith("Keine Songs")) && ( // Allgemeinere Fehlerprüfung
        <Button onClick={() => nav('/solo-config')} className="mt-6">Zurück zur Konfiguration</Button>
      )}
      </Card>
      </QuizLayout>
    );
  }

  // 3. Fall: Das Quiz läuft aktiv
  return (
    <QuizLayout>
    <Card className="space-y-4 sm:space-y-6">
    {/* Kopfzeile mit Kategorie, Modus, Punkten etc. */}
    <p className="text-center text-xs sm:text-sm text-gray-400">
    Kategorie: {catLabel} |
    {isSurvivalMode || isPracticeMode ? ( // Für Survival und Üben nur Song X
      `Song ${currentSongIndex + 1}`
    ) : ( // Für TimeTrial etc. Frage X/Y
    questionCntFromParams > 0
    ? `Frage ${currentSongIndex + 1}/${questionCntFromParams}`
    : `Frage ${currentSongIndex + 1}/${quizSongs.length}` // Fallback, falls count 0, aber nicht Survival/Practice
    )}
    {' | '}
    Modus: {
      modeParam === 'timetrial' ? 'Zeittrennen' :
      modeParam === 'survival' ? 'Survival' :
      modeParam === 'timetrial_hs' ? 'Zeit-High-Score' :
      modeParam === 'practice' ? 'Üben' :
      modeParam // Fallback
    }
    {/* Punkteanzeige oder Übungsmodus-Label */}
    {!isPracticeMode ? (
      <span className="relative inline-block ml-1">
      | Punkte: <span className="font-bold">{totalScore}</span>
      {scoreChangeFeedback.visible && (
        <span
        key={scoreChangeFeedback.key}
        className={`absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg shadow-lg text-lg font-bold animate-pulse-and-fade whitespace-nowrap
          ${scoreChangeFeedback.points > 0 ? 'bg-green-500 text-white' :
            (scoreChangeFeedback.points < 0 ? 'bg-red-500 text-white' :
            (scoreChangeFeedback.type === 'songIncorrectOrSkipped' ? 'bg-yellow-600 text-black' : 'bg-gray-500 text-white'))}`}
            >
            {scoreChangeFeedback.points > 0 ? `+${scoreChangeFeedback.points}` : scoreChangeFeedback.points} Pkt.
            {scoreChangeFeedback.type === 'songIncorrectOrSkipped' && scoreChangeFeedback.points === 0 && " (Übersprungen/Falsch)"}
            </span>
      )}
      </span>
    ) : (
      <span className="ml-1 font-semibold text-green-400"> (Übungsmodus)</span>
    )}
    </p>

    {/* Versuchsanzeige nur für Survival */}
    {modeParam === 'survival' && (
      <div className="flex justify-center gap-1">
      {Array.from({ length: FREEMODE_ATTEMPTS }, (_, i) => i + 1).map(n => (
        <div key={n} className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-xs font-bold ${freemodeAttemptIndicatorColor(n)}`} title={`Versuch ${n}`}>{n}</div>
      ))}
      </div>
    )}

    {/* Hauptbereich des laufenden Quiz */}
    <>
    <CustomAudioPlayer
    ref={audioPlayerRef}
    key={currentSong._id}
    src={currentSong.audio || ''}
    offset={currentSong.startTime ?? 0}
    maxSeek={effectiveMode === 'TimeTrial' && !isPracticeMode ? maxSeek : undefined} // Kein maxSeek im Übungsmodus
    onPlay={() => {
      setIsPlaying(true);
      if (!isSongActivated) setIsSongActivated(true); // Song als "aktiviert" markieren beim ersten Play
    }}
    onPause={() => setIsPlaying(false)}
    onEnded={() => {
      setIsPlaying(false);
      if (!isQuestionOver && !isPracticeMode) { // Im Übungsmodus passiert bei onEnded nichts außer Pause
        if (effectiveMode === 'TimeTrial' && !isSongGuessed) { // DNF für TimeTrial
          recordSongResult(currentSong, false, fails, true);
        } else if (modeParam === 'survival' && !isSongGuessed && attemptCount >= FREEMODE_ATTEMPTS) { // Für Survival, falls Song endet und Versuche aufgebraucht
          recordSongResult(currentSong, false, FREEMODE_ATTEMPTS, false);
          setIsQuizOver(true); // Quiz dann auch beenden
        }
      }
    }}
    onPosition={sec => {
      if (effectiveMode === 'TimeTrial' && !isPracticeMode && !isQuestionOver && isPlaying) {
        setMaxSeek(p => Math.max(p, sec));
      }
    }}
    onExposePause={fn => playerPauseRef.current = fn}
    />

    {/* Song-Zeitanzeige nur für TimeTrial (nicht Üben) */}
    {(modeParam === 'timetrial' || modeParam === 'timetrial_hs') && !isPracticeMode && (
      <p className="text-center text-xs sm:text-sm text-gray-400">
      Song-Zeit: {msToString(liveSongDisplayTime)} | Fehlversuche: {fails}
      </p>
    )}

    {/* Tipp-Button (nur wenn Frage nicht vorbei) */}
    {!isQuestionOver && (
      <Button
      onClick={handleBuyTip}
      disabled={remainingTipsCount === 0 || isQuestionOver || !isSongActivated} // Deaktiviert, bis Song einmal gestartet wurde
      variant="info"
      className="mt-2 w-full"
      >
      Tipp aufdecken ({remainingTipsCount} verf.)
      {!isPracticeMode && ` (-${TIP_COST} Pkt.)`}
      </Button>
    )}

    {/* Angezeigte Tipps */}
    {shownTips.length > 0 && (
      <div className="mt-2 p-3 bg-gray-800 rounded border border-gray-700 space-y-1 text-xs sm:text-sm">
      <h4 className="font-semibold text-blue-300 mb-1">Tipps:</h4>
      <ul className="list-disc list-inside text-gray-300">
      {shownTips.map((tip, tipIdx) => (
        <li key={tipIdx} className="break-words">
        {tip}
        </li>
      ))}
      </ul>
      </div>
    )}

    {/* Eingabebereich oder Nächster-Song-Button */}
    {!isQuestionOver ? (
      <>
      <div className="relative mt-2">
      <Input
      value={guess}
      onChange={e => setGuess(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter' && guess.trim()) { e.preventDefault(); handleSubmitAttempt(false); } }}
      onFocus={handleInputFocus}
      placeholder="Songtitel eingeben"
      className="text-sm sm:text-base"
      disabled={isQuestionOver || (effectiveMode === 'TimeTrial' && isSongGuessed && !isPracticeMode)} // Im Übungsmodus auch nach Richtig noch aktiv (falls man was nachschauen will, aber Raten-Button ist dann weg)
    />
    {suggestions.length > 0 && (
      <ul className="absolute w-full bg-gray-800 border border-gray-700 rounded-b max-h-32 sm:max-h-40 overflow-y-auto z-10 mt-1 text-xs sm:text-sm">
      {suggestions.map(t => ( <li key={t} className="px-3 py-1 hover:bg-blue-600 cursor-pointer" onClick={() => { setGuess(t); setSuggestions([]); }}>{t}</li> ))}
      </ul>
    )}
    </div>
    <div className="flex gap-2 mt-2">
    <Button
    onClick={() => handleSubmitAttempt(false)}
    disabled={!guess.trim() || isQuestionOver || (effectiveMode === 'TimeTrial' && isSongGuessed && !isPracticeMode)}
    className="flex-1 text-sm sm:text-base"
    >
    Raten
    </Button>
    <Button
    variant="secondary"
    onClick={() => handleSubmitAttempt(true)}
    disabled={isQuestionOver || (effectiveMode === 'TimeTrial' && isSongGuessed && !isPracticeMode)}
    className="flex-shrink-0 text-sm sm:text-base"
    >
    Überspringen
    </Button>
    </div>
    </>
    ) : !isQuizOver ? ( // Frage vorbei, aber Quiz noch nicht
    <Button onClick={handleNextSong} className="mt-4 w-full text-sm sm:text-base">
    {currentSongIndex + 1 < quizSongs.length ? "➡ Nächster Song" : "📊 Zum Ergebnis"}
    </Button>
    ) : null}

    {/* Problem melden Button (wenn Quiz und Frage nicht vorbei) */}
    {!isQuizOver && !isQuestionOver && currentSong._id && (
      <div className="mt-3 pt-3 border-t border-gray-600 text-center">
      <Button variant="warning" size="sm" onClick={openReportModal} className="text-xs">Problem mit diesem Song melden</Button>
      </div>
    )}

    {/* Info-Nachrichten und Verlauf */}
    {infoMessage && <p className="text-center font-semibold mt-3 text-sm sm:text-base break-words">{infoMessage}</p>}
    {history.length > 0 && (
      <ul className="text-xs sm:text-sm space-y-1 max-h-20 sm:max-h-24 overflow-y-auto p-2 bg-gray-800 rounded mt-2 border border-gray-700">
      {history.map((h, hIdx) => <li key={hIdx} className="break-words">{h}</li>)}
      </ul>
    )}
    </> {/* Schließt den Haupt-Wrapper für Quiz-Interaktionen */}
    </Card>

    {/* Modal für "Problem melden" */}
    {showReportModal && currentSong._id && (
      <Modal onClose={closeReportModal}>
      <h3 className="text-lg font-semibold mb-4 text-blue-300">Problem mit aktuellem Song melden</h3>
      <div className="space-y-3">
      <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">Art des Problems:</label>
      {PROBLEM_TYPES.map(pt => (
        <div key={pt.value} className="flex items-center mb-1">
        <input
        type="radio"
        id={`problem-${pt.value}`}
        name="problemType"
        value={pt.value}
        checked={currentReportProblemType === pt.value}
        onChange={(e) => setCurrentReportProblemType(e.target.value)}
        className="h-4 w-4 text-blue-500 border-gray-500 focus:ring-blue-400 bg-gray-700"
        />
        <label htmlFor={`problem-${pt.value}`} className="ml-2 block text-sm text-gray-200">{pt.label}</label>
        </div>
      ))}
      </div>
      <div>
      <label htmlFor="reportComment" className="block text-sm font-medium text-gray-300 mb-1">Optionaler Kommentar (max. 200 Zeichen):</label>
      <textarea
      id="reportComment"
      name="reportComment"
      rows="3"
      maxLength="200"
      value={currentReportComment}
      onChange={(e) => setCurrentReportComment(e.target.value)}
      className="w-full p-2 border border-gray-600 bg-gray-700 rounded text-white focus:ring-blue-500 focus:border-blue-500 text-sm"
      placeholder="z.B. Falsches Genre, Titel enthält Tippfehler..."
      />
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
} // Ende der SoloQuiz Komponente
