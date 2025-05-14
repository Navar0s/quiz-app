import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Card from './components/Card';
import Button from './components/Button';
import { useTheme } from './theme-context';

export default function GamemasterQuiz() {
  const [songs, setSongs] = useState([]);
  const [current, setCurrent] = useState(0);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const { theme } = useTheme();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const selectedCategories = params.get('categories')?.split(',') || [];
  const questionCount = Number(params.get('count')) || 10;

  useEffect(() => {
    fetch('http://localhost:3001/songs')
    .then(res => res.json())
    .then(data => {
      const filtered = data.filter(song => selectedCategories.includes(song.category));
      setSongs(filtered.slice(0, questionCount));
    });
  }, []);

  const currentSong = songs[current];

  const handlePoint = (name, delta) => {
    setScores(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + delta
    }));
  };

  const handleNext = () => {
    setCurrent(prev => prev + 1);
    if (audioRef.current) audioRef.current.pause();
  };

    const submitHighscores = async () => {
      try {
        const entries = players.map(name => ({
          name,
          score: scores[name] || 0,
          mode: 'gamemaster'
        }));

        await Promise.all(entries.map(entry =>
        fetch('http://localhost:3001/highscore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        })
        ));

        setSubmitted(true);
      } catch {
        setError('Fehler beim Speichern.');
      }
    };

    if (current >= songs.length) {
      return (
        <Card>
        <h2>🎉 Runde abgeschlossen!</h2>
        <ul>
        {players.map((p, i) => (
          <li key={i}>
          {p}: {scores[p] || 0} Punkte
          </li>
        ))}
        </ul>

        {submitted ? (
          <p style={{ color: theme.accent, marginTop: '1rem' }}>
          ✅ Ergebnisse gespeichert!
          </p>
        ) : (
          <>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <Button onClick={submitHighscores} style={{ marginTop: '1rem' }}>
          🏆 Highscores eintragen
          </Button>
          </>
        )}
        </Card>
      );
    }

    return (
      <Card>
      <h2>🎙️ Gamemaster-Modus</h2>
      <p>Frage {current + 1} von {songs.length}</p>

      {currentSong ? (
        <>
        <audio ref={audioRef} src={`http://localhost:3001${currentSong.file}`} controls autoPlay />
        <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
        Titel: <strong>{currentSong.title}</strong>
        </p>

        <div style={{ marginTop: '2rem' }}>
        <h3>👥 Spieler / Teams</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
        {players.map((name, i) => (
          <li key={i} style={{ marginBottom: '0.5rem' }}>
          <strong>{name}</strong>: {scores[name] || 0}
          <Button onClick={() => handlePoint(name, 1)} style={{ marginLeft: '1rem' }}>➕</Button>
          <Button onClick={() => handlePoint(name, -1)} style={{ marginLeft: '0.5rem' }}>➖</Button>
          </li>
        ))}
        </ul>

        <Button onClick={() => {
          const name = prompt('Neuer Spielername:');
          if (name) setPlayers(prev => [...prev, name]);
        }} style={{ marginTop: '1rem' }}>
        ➕ Spieler hinzufügen
        </Button>
        </div>

        <Button onClick={handleNext} style={{ marginTop: '2rem' }}>
        ⏭️ Nächster Song
        </Button>
        </>
      ) : (
        <p>🎉 Alle Songs abgespielt.</p>
      )}
      </Card>
    );
}
