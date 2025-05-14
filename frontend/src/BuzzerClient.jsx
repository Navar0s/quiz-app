import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Card from './components/Card';
import Input from './components/Input';
import Button from './components/Button';
import { useTheme } from './theme-context';
import { SOCKET_URL } from './api'; // NEU: Importieren

// ALT: const socket = io('http://localhost:3001');
// NEU:
const socket = io(SOCKET_URL, { // SOCKET_URL ist window.location.origin (oder was auch immer in api.js definiert ist)
  path: "/socket.io/",         // Wichtig: Pfad muss mit Nginx und Server übereinstimmen
  transports: ['websocket', 'polling']
});

export default function BuzzerClient() {
  const [name, setName] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [buzzed, setBuzzed] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    socket.on('buzzReset', () => setBuzzed(false));
    return () => socket.off('buzzReset');
  }, []);

  const joinGame = () => {
    if (!name.trim()) return;
    socket.emit('join', name);
    setHasJoined(true);
  };

  const handleBuzz = () => {
    if (!buzzed) {
      socket.emit('buzz', name);
      setBuzzed(true);
    }
  };

  const handleReady = () => {
    socket.emit('ready', name);
  };

  if (!hasJoined) {
    return (
      <Card>
      <h2>🔔 Buzzer beitreten</h2>
      <Input
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Dein Name"
      />
      <Button onClick={joinGame} style={{ marginTop: '1rem' }}>
      ➕ Beitreten
      </Button>
      </Card>
    );
  }

  return (
    <Card>
    <h2>🎮 Willkommen, {name}!</h2>

    <Button
    onClick={handleBuzz}
    disabled={buzzed}
    style={{
      marginTop: '2rem',
      background: buzzed ? '#444' : theme.button,
      color: buzzed ? '#999' : theme.buttonText,
      fontSize: '1.5rem'
    }}
    >
    🔔 Buzz!
    </Button>

    <Button onClick={handleReady} style={{ marginTop: '1rem' }}>
    ✅ Ready
    </Button>
    </Card>
  );
}
