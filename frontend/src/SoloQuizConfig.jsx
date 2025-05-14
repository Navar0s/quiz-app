//src/SoloQuizConfig.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
//import QuizLayout    from './QuizLayout';
import Card          from './components/Card';
import Input         from './components/Input';
import Button        from './components/Button';

const CATEGORIES = ['Filme', 'Serien', 'Games'];

/* Übersicht über alle Modi + Texte */
const MODES = [
    { id:'timetrial',    label:'Zeit­rennen',        col:0, row:0 },
{ id:'freemode',     label:'6 Versuche',        col:1, row:0 },
{ id:'timetrialHS',  label:'Zeit-High-Score',    col:0, row:1 },
{ id:'highscore',    label:'6 Versuche-HS',     col:1, row:1 },
];

export default function SoloQuizConfig() {
    const nav = useNavigate();

    /* ---------- State ---------- */
    const [mode,  setMode ] = useState('timetrial'); // Default = Zeitrennen
    const [count, setCount] = useState(10);
    const [cats,  setCats ] = useState(new Set());

    const fixedCount = 25;                           // alle HS-Varianten = 25

    /* ---------- Handler ---------- */
    const toggleCat = (c) => {
        setCats(prev => {
            const next = new Set(prev);
            next.has(c) ? next.delete(c) : next.add(c);
            return next;
        });
    };

    const startQuiz = () => {
        const q = new URLSearchParams();
        q.set('mode',  mode);
        q.set('count',
              mode==='highscore'  || mode==='timetrialHS'
              ? fixedCount
              : count
        );

        cats.forEach(c => q.append('categories', c));
        if (cats.size === 0) q.append('categories', 'Alle');

        nav(`/solo?${q.toString()}`);
    };

    /* ---------- UI ---------- */
    return (
        //<QuizLayout>
        <Card className="space-y-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center text-blue-400">
        🧩 Solo-Quiz&nbsp;Einstellungen
        </h2>

        {/* --- Matrix mit 4 Radio-Buttons ----------------------------- */}
        <div className="grid grid-cols-2 gap-4">
        {MODES.map(({id,label,col,row})=>(
            <label key={id}
            className="flex items-center gap-2 cursor-pointer
            col-start-[var(--c)] row-start-[var(--r)]"
            style={{'--c':col+1, '--r':row+1}}>
            <input
            type="radio"
            value={id}
            checked={mode===id}
            onChange={()=>setMode(id)}
            />
            {label}
            </label>
        ))}
        </div>

        {/* --- Fragenanzahl ------------------------------------------ */}
        <div>
        <label className="block mb-1">Fragenanzahl</label>
        <Input
        type="number"
        value={(mode==='highscore'||mode==='timetrialHS') ? fixedCount : count}
        disabled={(mode==='highscore'||mode==='timetrialHS')}
        onChange={e => setCount(Math.max(1, +e.target.value || 1))}
        min={1} max={50}
        />
        {(mode==='highscore'||mode==='timetrialHS') && (
            <p className="text-xs text-gray-400 mt-1">
            🏆 In allen High-Score-Varianten sind immer 25 Fragen fest eingestellt.
            </p>
        )}
        </div>

        {/* --- Kategorien -------------------------------------------- */}
        <div>
        <label className="block mb-1">Kategorien</label>

        {/* High-Score-Modi = genau 1 Kategorie auswählbar */}
        {mode==='highscore' || mode==='timetrialHS' ? (
            <div className="flex flex-wrap gap-4">
            {CATEGORIES.map(c=>(
                <label key={c} className="flex items-center gap-1 cursor-pointer">
                <input
                type="radio" name="cat"
                checked={cats.has(c)}
                onChange={()=>setCats(new Set([c]))}
                />
                {c}
                </label>
            ))}
            <label className="flex items-center gap-1 cursor-pointer">
            <input
            type="radio" name="cat"
            checked={cats.size===0}
            onChange={()=>setCats(new Set())}
            />
            Alle
            </label>
            </div>
        ) : (
            <div className="flex flex-wrap gap-4">
            {CATEGORIES.map(c=>(
                <label key={c} className="flex items-center gap-1 cursor-pointer">
                <input
                type="checkbox"
                checked={cats.has(c)}
                onChange={()=>toggleCat(c)}
                />
                {c}
                </label>
            ))}
            <span className="text-sm text-gray-400">(Keine ⇒ Alle)</span>
            </div>
        )}
        </div>

        {/* --- Start-Button ------------------------------------------ */}
        <Button className="w-full" onClick={startQuiz}>🎬 Starten</Button>
        </Card>
        //</QuizLayout>
    );
}
