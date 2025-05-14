import { useState } from 'react';
import { Link } from 'react-router-dom';
import ToggleSwitch from './ToggleSwitch';

export default function Header() {
    const [open, setOpen] = useState(false);

    return (
        <header className="bg-[var(--card)] text-[var(--text)] p-4 shadow-md flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">🎵 Themesong-Quiz</Link>

        <div className="relative">
        <button
        onClick={() => setOpen(!open)}
        className="text-[var(--text)] text-2xl focus:outline-none"
        >
        ☰
        </button>

        {open && (
            <div className="absolute right-0 mt-2 w-52 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50">
            <Link to="/" className="block px-4 py-2 hover:bg-[var(--secondary)]" onClick={() => setOpen(false)}>🏠 Startseite</Link>
            <Link to="/solo-config" className="block px-4 py-2 hover:bg-[var(--secondary)]" onClick={() => setOpen(false)}>🧠 Solo-Modus</Link>
            <Link to="/editor" className="block px-4 py-2 hover:bg-[var(--secondary)]" onClick={() => setOpen(false)}>🛠️ Editor</Link>
            <Link to="/highscore" className="block px-4 py-2 hover:bg-[var(--secondary)]" onClick={() => setOpen(false)}>🏆 Highscore</Link>

            <div className="border-t border-[var(--border)] mt-2 px-4 py-2">
            <ToggleSwitch />
            </div>
            </div>
        )}
        </div>
        </header>
    );
}
