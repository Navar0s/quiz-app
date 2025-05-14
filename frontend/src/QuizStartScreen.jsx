import { Link } from 'react-router-dom';
import Card from './components/Card'; // Stelle sicher, dass der Pfad zu deinen Komponenten korrekt ist
import Button from './components/Button'; // Stelle sicher, dass der Pfad zu deinen Komponenten korrekt ist

export default function QuizStartScreen() {
  return (
    <div style={styles.screen}>
    <Card style={styles.card}>
    <h1 style={styles.heading}>🎵 Willkommen beim ThemeQuiz</h1>
    <p style={styles.sub}>Wähle einen Spielmodus:</p>

    <div style={styles.block}>
    <Link to="/solo-config">
    <Button className="w-full">🧠 Solo-Modus</Button> {/* className="w-full" hinzugefügt */}
    </Link>
    {/* Link für Multiplayer bleibt, aber Button wird deaktiviert */}
    <Link to="/gamemaster-config" onClick={(e) => e.preventDefault()} style={{ cursor: 'not-allowed' }}> {/* Verhindert Navigation */}
    <Button className="w-full" disabled={true}> {/* className="w-full" und disabled={true} hinzugefügt */}
    🎛️ Multiplayer (WIP)
    </Button>
    </Link>
    {/* Buzzer-Config Button entfernt */}
    </div>

    <hr style={styles.separator} />

    <div style={styles.block}>
    <Link to="/editor">
    <Button variant="secondary" className="w-full">✏️ Quizdaten-Editor</Button> {/* className="w-full" hinzugefügt */}
    </Link>
    <Link to="/highscore">
    <Button variant="secondary" className="w-full" disabled={true}>🏆 Highscores (WIP)</Button> {/* className="w-full" hinzugefügt */}
    </Link>
    </div>
    </Card>
    </div>
  );
}

// Das styles-Objekt bleibt wie von dir bereitgestellt
const styles = {
  screen: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    backgroundColor: 'var(--background)', // Annahme: Diese CSS-Variablen sind global definiert
    color: 'var(--text)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem', // Tailwind: gap-4
    padding: '2rem', // Tailwind: p-8
    // Beachte: Wenn du Tailwind CSS sonst verwendest, könntest du diese Styles auch mit Tailwind-Klassen umsetzen
    // z.B. für Card: className="w-full max-w-md text-center flex flex-col gap-4 p-8 bg-gray-800 rounded-lg shadow-xl" (Beispiel)
  },
  heading: {
    fontSize: '2rem', // Tailwind: text-3xl (oder text-2xl, je nach Präferenz)
    fontWeight: 'bold', // Tailwind: font-bold
    color: 'var(--primary)',
  },
  sub: {
    fontSize: '0.9rem', // Tailwind: text-sm
    color: 'var(--text)',
    opacity: 0.7, // Tailwind: opacity-70
  },
  block: {
    display: 'flex', // Tailwind: flex
    flexDirection: 'column', // Tailwind: flex-col
    gap: '0.5rem', // Tailwind: gap-2
  },
  separator: {
    borderColor: 'var(--border)', // Tailwind: border-gray-700 (Beispiel)
    margin: '1rem 0', // Tailwind: my-4
  },
};
