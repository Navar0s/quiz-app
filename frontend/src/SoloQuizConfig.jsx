//src/SoloQuizConfig.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
//import QuizLayout    from './QuizLayout';
import Card          from './components/Card';
import Input         from './components/Input';
import Button        from './components/Button';
import Modal from './components/Modal';

const CATEGORIES = ['Filme', 'Serien', 'Games'];

const TIME_TRIAL_NORMAL_COUNTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const TIME_TRIAL_HS_COUNTS = [10, 25, 50]; // Deine gewünschten festen Werte für HS

/* Übersicht über alle Modi + Texte */
const MODES = [
    { id: 'timetrial',    label: 'Zeittrennen',         requiresCount: true,  countOptions: TIME_TRIAL_NORMAL_COUNTS, infoKey: 'timetrial' },
{ id: 'survival',     label: 'Survival',            requiresCount: false, infoKey: 'survival' }, // Bleibt false
{ id: 'timetrial_hs', label: 'Zeit-High-Score',     requiresCount: true,  countOptions: TIME_TRIAL_HS_COUNTS, infoKey: 'timetrial_hs' },
{ id: 'practice',     label: 'Üben',                requiresCount: true,  countOptions: TIME_TRIAL_NORMAL_COUNTS, infoKey: 'practice' },
];

// Beispiel für Modus-Infos (kann später in eine eigene Datei oder Konstante)
const MODE_DESCRIPTIONS = {
    timetrial: { title: 'Zeittrennen Modus', description: 'Beantworte die ausgewählte Anzahl an Fragen so schnell wie möglich. Punkte gibt es für schnelle und korrekte Antworten. Tipps kosten Punkte vom Song-Score.' },
    survival: { title: 'Survival Modus', description: 'Spiele Song für Song. Du hast 6 Rateversuche pro Song. Tipps können gekauft werden. Das Spiel endet, wenn ein Song übersprungen oder nach 6 Versuchen nicht korrekt beantwortet wurde. Ziel: So viele Songs wie möglich schaffen! Dein Ergebnis wird für die Highscore-Liste gewertet.' },
    timetrial_hs: { title: 'Zeit-High-Score Modus', description: 'Wie Zeittrennen, aber dein Ergebnis wird für die Highscore-Liste gewertet. Wähle 10, 25 oder 50 Fragen.' },
    practice: { title: 'Übungsmodus', description: 'Lerne die Songs ohne Zeitdruck oder Punkte. Tipps sind kostenlos (oder nicht verfügbar). Ideal zum Entdecken!' },
};

export default function SoloQuizConfig() {
    const nav = useNavigate();
    const [mode, setMode] = useState(MODES[0].id);
    const [count, setCount] = useState(MODES.find(m => m.id === MODES[0].id).countOptions?.[0] || 10);
    const [cats, setCats] = useState(new Set());
    const [showModeInfoModal, setShowModeInfoModal] = useState(false);
    const [modalModeInfo, setModalModeInfo] = useState({ title: '', description: '' });

    const [availableMinYear, setAvailableMinYear] = useState(null);
    const [availableMaxYear, setAvailableMaxYear] = useState(null);
    const [selectedMinYear, setSelectedMinYear] = useState('');
    const [selectedMaxYear, setSelectedMaxYear] = useState('');
    const [fetchError, setFetchError] = useState(null);

    // Logik, um den aktuellen Auswahlmodus für Kategorien zu bestimmen
    const categorySelectionMode = useMemo(() => {
        if (mode === 'survival' || mode === 'timetrial_hs') {
            return 'singleOrAll';
        }
        return 'multi';
    }, [mode]);

    useEffect(() => {
        // Fetch years for date range filter
        const fetchYears = async () => {
            try {
                setFetchError(null);
                const response = await fetch('/api/songs');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const songs = await response.json();

                if (songs.length === 0) {
                    setFetchError("Keine Songs gefunden, um den Jahresbereich zu bestimmen.");
                    const currentYear = new Date().getFullYear();
                    setAvailableMinYear(currentYear - 10); // Fallback
                    setAvailableMaxYear(currentYear);      // Fallback
                    setSelectedMinYear((currentYear - 10).toString());
                    setSelectedMaxYear(currentYear.toString());
                    return;
                }

                let minYear = Infinity;
                let maxYear = -Infinity;

                songs.forEach(song => {
                    const metadata = song.metadata || {};
                    let yearsToConsider = [];

                    if (song.category === 'Filme' || song.category === 'Games') {
                        const year = parseInt(metadata.Erscheinungsjahr, 10);
                        if (!isNaN(year)) yearsToConsider.push(year);
                    } else if (song.category === 'Serien') {
                        const start = parseInt(metadata.Startjahr, 10);
                        const end = parseInt(metadata.Endjahr, 10);
                        if (!isNaN(start)) yearsToConsider.push(start);
                        if (!isNaN(end)) yearsToConsider.push(end);
                    }

                    yearsToConsider.forEach(y => {
                        if (y < minYear) minYear = y;
                        if (y > maxYear) maxYear = y;
                    });
                });

                if (minYear === Infinity || maxYear === -Infinity) {
                    const currentYear = new Date().getFullYear();
                    minYear = currentYear - 10;
                    maxYear = currentYear;
                    console.warn("Keine gültigen Jahreszahlen in Song-Metadaten gefunden. Fallback wird verwendet.");
                }

                setAvailableMinYear(minYear);
                setAvailableMaxYear(maxYear);
                setSelectedMinYear(minYear.toString());
                setSelectedMaxYear(maxYear.toString());

            } catch (error) {
                console.error("Fehler beim Abrufen der Songs für Jahresbereich:", error);
                setFetchError(`Fehler beim Laden der Song-Jahre: ${error.message}.`);
                const currentYear = new Date().getFullYear();
                setAvailableMinYear(currentYear - 20); // Robust fallback
                setAvailableMaxYear(currentYear);
                setSelectedMinYear((currentYear - 20).toString());
                setSelectedMaxYear(currentYear.toString());
            }
        };

        fetchYears();

        // Bestehender Teil für 'count' und Kategorie-Logik
        const currentModeConfig = MODES.find(m => m.id === mode);
        if (currentModeConfig && currentModeConfig.requiresCount && currentModeConfig.countOptions) {
            if (!currentModeConfig.countOptions.includes(count) || count === undefined) {
                setCount(currentModeConfig.countOptions[0]);
            }
        } else if (currentModeConfig && !currentModeConfig.requiresCount) {
            // Optional: setCount(0) oder einen speziellen Wert
        }

        // Logik, um sicherzustellen, dass 'cats' mit categorySelectionMode konsistent ist
        if (categorySelectionMode === 'singleOrAll' && cats.size > 1) {
            setCats(new Set());
        }
    }, [mode, count, cats, categorySelectionMode]); // Dependencies: mode, count, cats, categorySelectionMode

    const handleMinYearChange = (e) => {
        const newMinYear = e.target.value;
        setSelectedMinYear(newMinYear);
        if (selectedMaxYear && parseInt(newMinYear, 10) > parseInt(selectedMaxYear, 10)) {
            setSelectedMaxYear(newMinYear);
        }
    };

    const handleMaxYearChange = (e) => {
        const newMaxYear = e.target.value;
        setSelectedMaxYear(newMaxYear);
        if (selectedMinYear && parseInt(newMaxYear, 10) < parseInt(selectedMinYear, 10)) {
            setSelectedMinYear(newMaxYear);
        }
    };

    const resetDateFilter = () => {
        if (availableMinYear !== null) setSelectedMinYear(availableMinYear.toString());
        if (availableMaxYear !== null) setSelectedMaxYear(availableMaxYear.toString());
    };

    // handleCategoryClick Funktion
    const handleCategoryClick = (categoryName) => {
        if (categorySelectionMode === 'singleOrAll') {
            if (categoryName === 'Alle') {
                setCats(new Set()); // "Alle" ausgewählt
            } else {
                // Spezifische Kategorie ausgewählt
                setCats(new Set([categoryName]));
            }
        } else { // categorySelectionMode === 'multi'
            // Toggle-Logik für Multi-Auswahl
            setCats(prevCats => {
                const nextCats = new Set(prevCats);
                if (nextCats.has(categoryName)) {
                    nextCats.delete(categoryName);
                } else {
                    nextCats.add(categoryName);
                }
                return nextCats;
            });
        }
    };

    const startQuiz = () => {
        const q = new URLSearchParams();
        q.set('mode', mode);

        const currentModeConfig = MODES.find(m => m.id === mode);
        if (currentModeConfig && currentModeConfig.requiresCount) {
            q.set('count', count.toString());
        }

        if (cats.size === 0) {
            q.append('categories', 'Alle');
        } else {
            cats.forEach(c => q.append('categories', c));
        }

        const sMinY = parseInt(selectedMinYear, 10);
        const sMaxY = parseInt(selectedMaxYear, 10);

        if (!isNaN(sMinY) && !isNaN(sMaxY) &&
            availableMinYear !== null && availableMaxYear !== null &&
            (sMinY !== availableMinYear || sMaxY !== availableMaxYear)) {
            q.set('startDate', sMinY.toString());
            q.set('endDate', sMaxY.toString());
        }

        nav(`/solo?${q.toString()}`);
    };



    const openModeInfo = (modeIdOrInfoKey) => { // Nennen wir den Parameter modeIdOrInfoKey für Klarheit
        const info = MODE_DESCRIPTIONS[modeIdOrInfoKey]; // Greift auf MODE_DESCRIPTIONS zu
        if (info) {
            setModalModeInfo(info);
            setShowModeInfoModal(true); // Wichtig: Dieser State muss das Modal triggern
        } else {
            console.warn(`Keine Beschreibung für modeKey ${modeIdOrInfoKey} gefunden.`); // Hilfreich für Debugging
        }
    };

    /* ---------- UI ---------- */
    return (
        <Card className="space-y-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center text-blue-400">
        🧩 Solo-Quiz Einstellungen
        </h2>

        {fetchError && <p className="text-sm text-red-500 text-center py-2">{fetchError}</p>}

        {/* --- Modusauswahl als Button-Grid --- */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {MODES.map(({ id, label, infoKey }) => (
            <div key={id} className="flex flex-col items-center"> {/* items-center hinzugefügt */}
            <Button
            onClick={() => setMode(id)}
            className={`w-full py-3 text-center font-medium rounded-md transition-colors
                ${mode === id
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
        {label}
        </Button>
        {/* NEUER Info-Button mit SVG-Icon */}
        <button
        onClick={() => openModeInfo(infoKey)}
        className="mt-2 p-1.5 rounded-full text-blue-400 hover:text-blue-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800" // Angepasste Klassen
        aria-label={`Informationen zum Modus ${label}`}
        title={`Infos zu ${label}`} // title-Attribut für Desktop-Hover
        >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"> {/* Größe und Farbe werden vom Button geerbt oder hier gesetzt */}
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        </button>
        </div>
        ))}
        </div>

        {/* --- Fragenanzahl --- */}
        {MODES.find(m => m.id === mode)?.requiresCount && (
            <div className="pt-2"> {/* Etwas Abstand nach oben */}
            <label htmlFor="questionCountSelect" className="block mb-1 font-medium text-gray-300">Fragenanzahl</label>
            <select
            id="questionCountSelect"
            value={count}
            onChange={e => setCount(parseInt(e.target.value, 10))}
            className="w-full p-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
            {MODES.find(m => m.id === mode)?.countOptions?.map(num => (
                <option key={num} value={num}>{num} Fragen</option>
            ))}
            </select>
            {(mode === 'timetrial_hs') && (
                <p className="text-xs text-gray-400 mt-1">
                🏆 Für Zeit-High-Score. Wähle 10, 25 oder 50 Fragen.
                </p>
            )}
            </div>
        )}
        {/* Hinweise für Modi ohne Fragenanzahl-Auswahl */}
        {mode === 'survival' && ( <p className="text-sm text-gray-400 pt-2">Im Survival-Modus spielst du bis zum ersten Fehler.</p> )}

        {/* --- Kategorien NEU --- */}
        <div className="pt-2">
        <label className="block mb-2 font-medium text-gray-300">Kategorien:</label>
        <div className="flex flex-wrap gap-3">
        {/* Spezifische Kategorie-Buttons, immer sichtbar */}
        {CATEGORIES.map(catName => (
            <Button
            key={catName}
            onClick={() => handleCategoryClick(catName)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-900
                ${ (categorySelectionMode === 'singleOrAll' ? (cats.has(catName) && cats.size === 1) : cats.has(catName))
                    ? 'bg-blue-600 text-white ring-blue-400 hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-300 ring-gray-600 hover:bg-gray-600 hover:text-white'
                }`}
                >
                {catName}
                </Button>
        ))}
        {/* "Alle" Button nur für den 'singleOrAll' Modus */}
        {categorySelectionMode === 'singleOrAll' && (
            <Button
            key="Alle"
            onClick={() => handleCategoryClick('Alle')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 ring-offset-2 ring-offset-gray-900
                ${ cats.size === 0 // Aktiv, wenn keine spezifische Kategorie ausgewählt ist
                    ? 'bg-green-600 text-white ring-green-400 hover:bg-green-700'
                    : 'bg-gray-700 text-gray-300 ring-gray-600 hover:bg-gray-600 hover:text-white'
                }`}
                >
                Gemischt
                </Button>
        )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
        {categorySelectionMode === 'singleOrAll'
            ? (cats.size === 0 ? "Gewählt: Alle Kategorien" : `Gewählt: Nur ${[...cats][0]}`)
            : (cats.size === 0 ? "Gewählt: Alle Kategorien (oder keine gewählt)" : `Gewählt: ${[...cats].join(', ')}`)
        }
        </p>
        </div>

        {/* --- Jahresbereich Filter --- */}
        <div className="pt-2">
            <label className="block mb-1 font-medium text-gray-300">Jahresbereich (optional):</label>
            <div className="flex items-center space-x-2">
                <Input
                    type="number"
                    id="minYear"
                    name="minYear"
                    value={selectedMinYear}
                    min={availableMinYear || ''}
                    max={availableMaxYear || ''}
                    onChange={handleMinYearChange}
                    disabled={availableMinYear === null || availableMaxYear === null}
                    className="w-full p-2"
                    placeholder="Min Jahr"
                />
                <span className="text-gray-400">-</span>
                <Input
                    type="number"
                    id="maxYear"
                    name="maxYear"
                    value={selectedMaxYear}
                    min={availableMinYear || ''}
                    max={availableMaxYear || ''}
                    onChange={handleMaxYearChange}
                    disabled={availableMinYear === null || availableMaxYear === null}
                    className="w-full p-2"
                    placeholder="Max Jahr"
                />
                <Button
                    onClick={resetDateFilter}
                    disabled={availableMinYear === null || availableMaxYear === null}
                    variant="secondary"
                    className="py-2 px-3 text-sm"
                >
                    Reset
                </Button>
            </div>
            {(availableMinYear === null || availableMaxYear === null) && !fetchError && (
                 <p className="text-xs text-yellow-400 mt-1">Lade Jahresbereich...</p>
            )}
        </div>


        <Button className="w-full py-3 font-semibold" onClick={startQuiz}>🎬 Quiz Starten</Button>

        {/* Modal für Modus-Infos */}
        {showModeInfoModal && (
            <Modal onClose={() => setShowModeInfoModal(false)}>
            <h3 className="text-xl font-semibold text-blue-300 mb-4">{modalModeInfo.title}</h3>
            <p className="mt-2 text-gray-300 whitespace-pre-line">{modalModeInfo.description}</p>
            <div className="mt-6 flex justify-end">
            <Button onClick={() => setShowModeInfoModal(false)}>Verstanden</Button>
            </div>
            </Modal>
        )}
        </Card>
    );
}
