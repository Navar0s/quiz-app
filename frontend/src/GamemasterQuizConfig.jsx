import { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { useNavigate } from 'react-router-dom';
import Card from './components/Card';
import Select from './components/Select';
import Button from './components/Button';
import { useTheme } from './theme-context';

export default function GamemasterQuizConfig() {
    const [categories, setCategories] = useState([]);
    const [count, setCount] = useState(10);
    const { theme } = useTheme();
    const navigate = useNavigate();

    const [availableMinYear, setAvailableMinYear] = useState(null);
    const [availableMaxYear, setAvailableMaxYear] = useState(null);
    const [selectedMinYear, setSelectedMinYear] = useState('');
    const [selectedMaxYear, setSelectedMaxYear] = useState('');
    const [fetchError, setFetchError] = useState(null);
    const [allFetchedSongs, setAllFetchedSongs] = useState([]); // State for all songs

    const [allFetchedSongs, setAllFetchedSongs] = useState([]); // State for all songs
    const [displayedSongCount, setDisplayedSongCount] = useState(0); // For accurate count

    useEffect(() => {
        const fetchYears = async () => {
            try {
                setFetchError(null);
                const response = await fetch('/api/songs');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const songs = await response.json();
                setAllFetchedSongs(songs); // Store all fetched songs

                if (songs.length === 0) {
                    setFetchError("Keine Songs gefunden, um den Jahresbereich zu bestimmen.");
                    const currentYear = new Date().getFullYear();
                    setAvailableMinYear(currentYear); // Fallback
                    setAvailableMaxYear(currentYear); // Fallback
                    setSelectedMinYear(currentYear.toString()); // Set selected years too
                    setSelectedMaxYear(currentYear.toString()); // Set selected years too
                    // allFetchedSongs is already set to [] by the above setAllFetchedSongs(songs) if songs is []
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
                    // Fallback if no valid years found in any song metadata
                    const currentYear = new Date().getFullYear();
                    minYear = currentYear - 10; // Arbitrary fallback
                    maxYear = currentYear;
                    console.warn("Keine gültigen Jahreszahlen in Song-Metadaten gefunden. Fallback wird verwendet.");
                }

                setAvailableMinYear(minYear);
                setAvailableMaxYear(maxYear);
                setSelectedMinYear(minYear.toString());
                setSelectedMaxYear(maxYear.toString());

            } catch (error) {
                console.error("Fehler beim Abrufen der Songs für Jahresbereich:", error);
                setFetchError(`Fehler beim Laden der Song-Jahre: ${error.message}. Bitte versuchen Sie es später erneut.`);
                // Fallback, um die Seite nutzbar zu halten, falls API nicht erreichbar
                const currentYear = new Date().getFullYear();
                setAvailableMinYear(currentYear - 20);
                setAvailableMaxYear(currentYear);
                setSelectedMinYear((currentYear - 20).toString());
                setSelectedMaxYear(currentYear.toString());
                setAllFetchedSongs([]); // Explicitly set to empty on error
            }
        };

        fetchYears();
    }, []);

    // Effect for calculating and setting the displayed song count
    useEffect(() => {
        const minYearNum = parseInt(selectedMinYear, 10);
        const maxYearNum = parseInt(selectedMaxYear, 10);

        if (allFetchedSongs.length === 0 || isNaN(minYearNum) || isNaN(maxYearNum)) {
            setDisplayedSongCount(0);
            return;
        }

        const filterBySpecificCategories = categories.length > 0;

        const count = allFetchedSongs.filter(song => {
            if (filterBySpecificCategories && !categories.includes(song.category)) {
                return false;
            }

            const metadata = song.metadata || {};
            if (song.category === 'Filme' || song.category === 'Games') {
                const erscheinungsjahr = parseInt(metadata.Erscheinungsjahr, 10);
                if (isNaN(erscheinungsjahr)) return false;
                return erscheinungsjahr >= minYearNum && erscheinungsjahr <= maxYearNum;
            } else if (song.category === 'Serien') {
                const startjahr = parseInt(metadata.Startjahr, 10);
                let endjahr = parseInt(metadata.Endjahr, 10);
                if (isNaN(endjahr) || metadata.Endjahr === null || String(metadata.Endjahr).trim() === '') {
                    endjahr = new Date().getFullYear() + 100;
                }
                if (isNaN(startjahr)) return false;
                return startjahr <= maxYearNum && endjahr >= minYearNum;
            }
            return false;
        }).length;
        setDisplayedSongCount(count);
    }, [allFetchedSongs, categories, selectedMinYear, selectedMaxYear]);


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

    const toggleCategory = (cat) => {
        setCategories(prev =>
        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const startGame = () => {
        const query = new URLSearchParams();
        if (categories.length > 0) {
            query.set('categories', categories.join(','));
        }
        query.set('count', count);

        const sMinY = parseInt(selectedMinYear, 10);
        const sMaxY = parseInt(selectedMaxYear, 10);

        if (!isNaN(sMinY) && !isNaN(sMaxY) &&
            availableMinYear !== null && availableMaxYear !== null &&
            (sMinY !== availableMinYear || sMaxY !== availableMaxYear)) {
            query.set('startDate', sMinY.toString());
            query.set('endDate', sMaxY.toString());
        }
        navigate(`/gamemaster/play?${query.toString()}`);
    };

    return (
        <Card>
        <h2>🎙️ Gamemaster konfigurieren</h2>

        {fetchError && <p style={{ color: 'red' }}>{fetchError}</p>}

        <div style={{ marginTop: '1rem' }}>
        <p>Kategorien (optional, wähle min. 1 für reine Kategorie-Spiele):</p>
        {['Filme', 'Serien', 'Games'].map(cat => ( // Angepasst an Backend-Kategorien
            <label key={cat} style={{ marginRight: '1rem' }}>
            <input
            type="checkbox"
            checked={categories.includes(cat)}
            onChange={() => toggleCategory(cat)}
            />{' '}
            {cat}
            </label>
        ))}
        </div>

        <div style={{ marginTop: '1.5rem' }}>
        <p>Jahresbereich (optional):</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="minYear">Von:</label>
            <input
                type="number"
                id="minYear"
                value={selectedMinYear}
                min={availableMinYear || ''}
                max={availableMaxYear || ''}
                onChange={handleMinYearChange}
                disabled={availableMinYear === null || availableMaxYear === null}
                style={{ width: '80px' }}
            />
            <label htmlFor="maxYear">Bis:</label>
            <input
                type="number"
                id="maxYear"
                value={selectedMaxYear}
                min={availableMinYear || ''}
                max={availableMaxYear || ''}
                onChange={handleMaxYearChange}
                disabled={availableMinYear === null || availableMaxYear === null}
                style={{ width: '80px' }}
            />
            <Button
                onClick={resetDateFilter}
                disabled={availableMinYear === null || availableMaxYear === null}
                variant="secondary"
                size="small"
            >
                Zurücksetzen
            </Button>
        </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
        <p>Anzahl Fragen:</p>
        <Select
        value={count}
        onChange={e => setCount(Number(e.target.value))}
        options={[10, 15, 20, 25, 30, 50, 100]} // Mehr Optionen
        />
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: theme?.textColorMuted || 'grey' }}>
            Verfügbare Songs für aktuelle Auswahl: {displayedSongCount}
        </p>

        <Button
        onClick={startGame}
        style={{ marginTop: '1rem' }} // Reduced margin a bit to accommodate the count text
        // Spiel starten immer erlaubt, auch ohne Kategorie (dann alle Songs)
        // disabled={categories.length === 0}
        >
        ▶️ Spiel starten
        </Button>
        </Card>
    );
}
