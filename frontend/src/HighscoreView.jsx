import { useEffect, useState } from 'react';
import { API } from './api';
import QuizLayout from './QuizLayout';
import Card from './components/Card';
import Button from './components/Button';

const MODES      = ['solo', 'gamemaster', 'buzzer', 'timetrial'];
const CATEGORIES = ['Alle', 'Filme', 'Serien', 'Games'];

const msToString = ms => {
  const t  = Math.round(ms / 100) / 10;
  const mm = String(Math.floor(t / 60)).padStart(2,'0');
  const ss = String((t % 60).toFixed(1)).padStart(4,'0');
  return `${mm}:${ss}`;
};

export default function HighscoreView() {
  const [list, setList]       = useState([]);
  const [mode, setMode]       = useState('solo');
  const [cat,  setCat]        = useState('Alle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/highscore`)
    .then(r => r.json())
    .then(data => { setList(data); setLoading(false); });
  }, []);

  /* -------- Filter + Sort -------- */
  const filtered = list
  .filter(e => e.mode === mode)
  .filter(e => mode !== 'solo' || cat === 'Alle' || e.category === cat)
  .sort((a, b) =>
  mode === 'timetrial'
  ? a.totalTime - b.totalTime
  : b.score     - a.score
  )
  .slice(0, 20);

  /* -------- UI -------- */
  return (
    <QuizLayout>
    <Card className="space-y-6 max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold text-center text-blue-400">🏆 Highscores</h2>

    {/* Top Tabs */}
    <div className="flex justify-center gap-3">
    {MODES.map(m => (
      <Button
      key={m}
      onClick={() => { setMode(m); setCat('Alle'); }}
      variant={mode === m ? 'primary' : 'secondary'}
      >
      {m.charAt(0).toUpperCase() + m.slice(1)}
      </Button>
    ))}
    </div>

    {/* Kategorie-Tabs nur im Solo-Modus */}
    {mode === 'solo' && (
      <div className="flex justify-center gap-3">
      {CATEGORIES.map(c => (
        <Button
        key={c}
        onClick={() => setCat(c)}
        variant={cat === c ? 'primary' : 'secondary'}
        >
        {c}
        </Button>
      ))}
      </div>
    )}

    {/* Tabelle */}
    {loading ? (
      <p className="text-center">⏳ Lade …</p>
    ) : filtered.length === 0 ? (
      <p className="text-center">Keine Einträge.</p>
    ) : (
      <table className="w-full text-left border-collapse">
      <thead>
      <tr className="border-b border-gray-600">
      <th className="py-2 px-1">#</th>
      <th className="py-2 px-1">Name</th>
      {mode === 'timetrial'
        ? <>
        <th className="py-2 px-1">Zeit</th>
        <th className="py-2 px-1 hidden sm:table-cell">Ø&nbsp;Zeit</th>
        <th className="py-2 px-1 hidden sm:table-cell">Ø&nbsp;Fehler</th>
        </>
        : <th className="py-2 px-1">Punkte</th>}
        <th className="py-2 px-1 hidden sm:table-cell">Datum</th>
        </tr>
        </thead>
        <tbody>
        {filtered.map((e, i) => (
          <tr key={i} className="border-b border-gray-700">
          <td className="py-1 px-1">{i + 1}</td>
          <td className="py-1 px-1">{e.name}</td>
          {mode === 'timetrial'
            ? <>
            <td className="py-1 px-1">{msToString(e.totalTime)}</td>
            <td className="py-1 px-1 hidden sm:table-cell">{e.avgTime ? msToString(e.avgTime) : '–'}</td>
            <td className="py-1 px-1 hidden sm:table-cell">{e.avgFails?.toFixed?.(1) ?? '–'}</td>
            </>
            : <td className="py-1 px-1">{e.score}</td>}
            <td className="py-1 px-1 hidden sm:table-cell">
            {new Date(e.date).toLocaleDateString()}
            </td>
            </tr>
        ))}
        </tbody>
        </table>
    )}
    </Card>
    </QuizLayout>
  );
}
