import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import Card from './components/Card';
import Button from './components/Button';
import { useTheme } from './theme-context';
import { API, SOCKET_URL, API_BASE_URL } from './api'; // NEU: API und API_BASE_URL importieren

// ALT: const socket = io('http://localhost:3001');
// NEU:
const socket = io(SOCKET_URL, { // SOCKET_URL ist window.location.origin (oder was auch immer in api.js definiert ist)
  path: "/socket.io/",         // Wichtig: Pfad muss mit Nginx und Server übereinstimmen
  transports: ['websocket', 'polling']
});

export default function BuzzerQuizHost() {
  const [players, setPlayers] = useState([]);
  const [buzzed, setBuzzed] = useState(null);
  const [readyList, setReadyList] = useState([]);
  const [round, setRound] = useState(1);
  const [songIndex, setSongIndex] = useState(0);
  const [songs, setSongs] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const { theme } = useTheme();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const selectedCategories = params.get('categories')?.split(',') || [];
  const questionCount = Number(params.get('count')) || 10;

  useEffect(() => {
    // ALT: fetch('http://localhost:3001/songs')
    // NEU:
    fetch(`${API}/songs`) // Nutzt die API-Konstante für den korrekten Pfad über Nginx
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      const filtered = selectedCategories.length > 0 && !selectedCategories.includes('Alle')
      ? data.filter(song => selectedCategories.includes(song.category))
      : data; // Wenn keine Kategorien oder "Alle" gewählt, alle Songs nehmen
      setSongs(filtered.sort(() => 0.5 - Math.random()).slice(0, questionCount)); // Zufällige Auswahl
    })
    .catch(error => {
      console.error("Fehler beim Laden der Songs für BuzzerQuiz:", error);
      // Hier könntest du eine Fehlermeldung im UI anzeigen
    });
  }, [selectedCategories, questionCount]); // Abhängigkeiten hinzugefügt

  useEffect(() => {
    socket.on('buzzed', (name) => {
      setBuzzed(name);
      if (audioRef.current) audioRef.current.pause();
    });

      socket.on('ready', (name) => {
        setReadyList(prev => Array.from(new Set([...prev, name])));
      });

      // Annahme: 'playerList' wird vom Server gesendet, wenn sich Spieler anmelden/abmelden
      // Es ist besser, die Spielerliste direkt vom Server zu empfangen,
      // anstatt sie nur bei 'join' zu aktualisieren.
      // Wenn der Server bei 'join' die komplette Liste an alle sendet, ist das ok.
      socket.on('playerListUpdate', (updatedPlayers) => { // Beispiel für einen besseren Event-Namen
        setPlayers(updatedPlayers);
      });
      // Falls dein Server immer noch 'playerList' für einzelne Joins sendet,
      // musst du die Logik hier anpassen oder den Server ändern.
      // Für den Moment lasse ich es so, wie es war, aber 'playerListUpdate' wäre robuster.
      socket.on('playerList', (listOrPlayerName) => { // Annahme: Server sendet die komplette Liste oder nur den Namen
        if (Array.isArray(listOrPlayerName)) {
          setPlayers(listOrPlayerName);
        } else if (typeof listOrPlayerName === 'string') {
          // Wenn nur ein Name kommt, füge ihn hinzu (verhindert Duplikate)
          setPlayers(prev => Array.from(new Set([...prev, listOrPlayerName])));
        }
      });


      return () => {
        socket.off('buzzed');
        socket.off('ready');
        socket.off('playerListUpdate'); // oder socket.off('playerList');
  socket.off('playerList');
      };
  }, []);

  const handleStart = () => {
    if (!songs[songIndex] || !audioRef.current) return;
    audioRef.current.play().catch(error => console.error("Audio Playback Error:", error));
    setIsPlaying(true);
  };

  const handleNext = () => {
    setSongIndex(prev => (prev + 1 < songs.length ? prev + 1 : prev)); // Verhindert out-of-bounds
    setBuzzed(null);
    setReadyList([]);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Song zurücksetzen
    }
    socket.emit('buzzReset');
    // Nächste Runde nur wenn es noch Songs gibt
    if (songIndex + 1 < songs.length) {
      setRound(r => r + 1);
    }
  };

  const currentSong = songs[songIndex];

  return (
    <Card>
    <h2>🎙️ Buzzer Host</h2>
    {currentSong && <p>🔢 Runde {round} / {songs.length}</p>}

    {currentSong ? (
      <>
      <audio
      ref={audioRef}
      // ALT: src={`http://localhost:3001${songs[songIndex].file}`}
      // NEU: Annahme: currentSong.audio ist z.B. "/audio/lied.mp3"
      src={`${API_BASE_URL}${currentSong.audio}`}
      controls
      style={{ marginTop: '1rem', width: '100%' }}
      onEnded={() => setIsPlaying(false)} // Setzt isPlaying zurück, wenn der Song endet
      />
      <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
      Titel: {currentSong.title} | Kategorie: {currentSong.category}
      </p>

      {!isPlaying && (
        <Button onClick={handleStart} style={{ marginTop: '1rem' }}>
        ▶️ Start
        </Button>
      )}

      {/* Nächster Song Button nur anzeigen, wenn es noch einen nächsten Song gibt oder der aktuelle nicht der letzte ist */}
      {(songIndex < songs.length -1 || isPlaying || buzzed) && (
        <Button onClick={handleNext} style={{ marginTop: '1rem' }} disabled={!isPlaying && !buzzed && songIndex >= songs.length -1}>
        ⏭️ Nächster Song / Antwort auflösen
        </Button>
      )}


      {buzzed && (
        <p style={{ marginTop: '1rem', fontWeight: 'bold', color: theme.accent }}>
        🔔 {buzzed} hat gebuzzert!
        </p>
      )}
      </>
    ) : (
      <p style={{ marginTop: '2rem' }}>🎉 Quiz beendet oder keine Songs für die Auswahl geladen.</p>
    )}

    <hr style={{ margin: '2rem 0', borderColor: theme.border }} />

    <h3>👥 Spieler ({players.length}):</h3>
    {players.length > 0 ? (
      <ul>
      {players.map((p, i) => (
        <li key={i}>
        {p} {readyList.includes(p) && '✅'}
        </li>
      ))}
      </ul>
    ) : (
      <p>Warte auf Spieler...</p>
    )}


    <Button onClick={() => {
      setBuzzed(null);
      setReadyList([]); // Auch Ready-Status zurücksetzen
      socket.emit('buzzReset');
    }} style={{ marginTop: '2rem' }}>
    ♻️ Buzzer & Ready-Status zurücksetzen
    </Button>
    </Card>
  );
}
