// frontend/src/HighscoreView.jsx
import { useState, useEffect, useMemo } from 'react';
import { API } from './api';
//import QuizLayout from './QuizLayout';
import Card from './components/Card';
import Button from './components/Button';
//import { CATEGORIES as APP_CATEGORIES, HIGHSCORE_QUESTION_COUNTS as TT_HS_QUESTION_COUNTS } from './config/quizConfig'; // Importieren

const msToString = ms => {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '00:00.0';
  const t  = Math.round(ms/100)/10;
  const mm = String(Math.floor(t/60)).padStart(2,'0');
  const ss = String((t%60).toFixed(1)).padStart(4,'0');
  return `${mm}:${ss}`;
};

const formatDate = (isoTimestamp) => {
  if (!isoTimestamp) return 'N/A';
  try {
    const date = new Date(isoTimestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Invalid Date';
  }
};

// Konstanten für Filteroptionen
const TT_HS_QUESTION_COUNTS = [10, 25, 50]; // Entspricht HIGHSCORE_QUESTION_COUNTS aus quizConfig
const APP_CATEGORIES = ['Filme', 'Serien', 'Games']; // Entspricht CATEGORIES aus quizConfig
const CATEGORIES_WITH_MIXED = [...APP_CATEGORIES, "mixed"];

// Hilfsfunktion für die Standard-Sortierkonfiguration pro Tab
const getDefaultSortConfig = (tab) => {
  if (tab.startsWith('timetrial_')) {
    return { key: 'score', direction: 'descending' };
  } else if (tab === 'survival') {
    return { key: 'songsCleared', direction: 'descending' };
  }
  return { key: null, direction: 'ascending' }; // Fallback
};

export default function HighscoreView() {
  // --- State Hooks ---
  const [highscores, setHighscores] = useState({ timetrial_hs: [], survival: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(`timetrial_${TT_HS_QUESTION_COUNTS[0]}`);

  // Filter States
  const [categoryFilterTT, setCategoryFilterTT] = useState('alle');
  const [categoryFilterSurvival, setCategoryFilterSurvival] = useState('alle');

  // Sortier-State
  const [sortConfig, setSortConfig] = useState(getDefaultSortConfig(activeTab));

  // --- useEffect Hooks ---

  // Daten vom Backend abrufen
  useEffect(() => {
    const fetchHighscores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API}/highscores`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unbekannter Fehler beim Abrufen der Highscores.' }));
          throw new Error(errorData.message || `Serverfehler: ${response.status}`);
        }
        const data = await response.json();
        setHighscores({
          timetrial_hs: Array.isArray(data.timetrial_hs) ? data.timetrial_hs : [],
                      survival: Array.isArray(data.survival) ? data.survival : [],
        });
      } catch (err) {
        console.error("Fehler beim Laden der Highscores:", err);
        setError(err.message);
        setHighscores({ timetrial_hs: [], survival: [] });
      } finally {
        setIsLoading(false);
      }
    };
    fetchHighscores();
  }, []); // Nur beim Mounten ausführen

  // Sortierung zurücksetzen, wenn der Tab wechselt
  useEffect(() => {
    setSortConfig(getDefaultSortConfig(activeTab));
  }, [activeTab]);

  // --- useMemo Hooks für Datenverarbeitung ---

  // Gefilterte TimeTrial Scores
  const filteredTimeTrialScores = useMemo(() => {
    // Ermittle die ausgewählte Fragenanzahl aus dem activeTab
    const currentQuestionCount = parseInt(activeTab.split('_')[1]);

    return highscores.timetrial_hs.filter(score => {
      const passesQuestionCount = score.questionCount === currentQuestionCount;
      const passesCategory = categoryFilterTT === 'alle' || score.category === categoryFilterTT;
      return passesQuestionCount && passesCategory;
    });
  }, [highscores.timetrial_hs, activeTab, categoryFilterTT]);

  // Gefilterte Survival Scores
  const filteredSurvivalScores = useMemo(() => {
    return highscores.survival.filter(score => {
      const passesCategory = categoryFilterSurvival === 'alle' || score.category === categoryFilterSurvival;
      return passesCategory;
    });
  }, [highscores.survival, categoryFilterSurvival]);

  // Sortierte TimeTrial Scores
  const sortedTimeTrialScores = useMemo(() => {
    let sortableItems = [...filteredTimeTrialScores];
    if (sortConfig.key && activeTab.startsWith('timetrial_')) {
      sortableItems.sort((a, b) => {
        let valA, valB;

        if (sortConfig.key === 'avgTime') { // Spezielle Behandlung für berechnete Durchschnittszeit
          valA = a.correctlyGuessed > 0 ? (a.totalTimeMs / a.correctlyGuessed) : Infinity;
          valB = b.correctlyGuessed > 0 ? (b.totalTimeMs / b.correctlyGuessed) : Infinity;
        } else {
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
        }

        // Grundlegende Typbehandlung für Sortierung
        if (typeof valA === 'string' && typeof valB === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        } else if (valA === null || valA === undefined) valA = sortConfig.direction === 'ascending' ? Infinity : -Infinity; // Null/Undefined ans Ende/Anfang
        else if (valB === null || valB === undefined) valB = sortConfig.direction === 'ascending' ? Infinity : -Infinity;

        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;

        // Sekundäre Sortierung: Bei gleichem Primärschlüssel (außer Zeit selbst) nach Gesamtzeit (aufsteigend)
        if (sortConfig.key !== 'totalTimeMs' && a.totalTimeMs !== undefined && b.totalTimeMs !== undefined) {
          return a.totalTimeMs - b.totalTimeMs;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredTimeTrialScores, sortConfig, activeTab]);

  // Sortierte Survival Scores
  const sortedSurvivalScores = useMemo(() => {
    let sortableItems = [...filteredSurvivalScores];
    if (sortConfig.key && activeTab === 'survival') {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        // Grundlegende Typbehandlung für Sortierung
        let compA = valA, compB = valB;
        if (typeof valA === 'string' && typeof valB === 'string') {
          compA = valA.toLowerCase();
          compB = valB.toLowerCase();
        } else if (valA === null || valA === undefined) compA = sortConfig.direction === 'ascending' ? Infinity : -Infinity;
        else if (valB === null || valB === undefined) compB = sortConfig.direction === 'ascending' ? Infinity : -Infinity;


        if (compA < compB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (compA > compB) return sortConfig.direction === 'ascending' ? 1 : -1;

        // Sekundäre Sortierung: Bei gleichen songsCleared nach Score (absteigend)
        if (sortConfig.key === 'songsCleared' && a.score !== undefined && b.score !== undefined) {
          return b.score - a.score; // Höherer Score besser
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredSurvivalScores, sortConfig, activeTab]);

  // --- Hilfsfunktionen für UI ---

  const requestSort = (clickedKey) => {
    let direction = 'ascending';
    if (sortConfig.key === clickedKey && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === clickedKey && sortConfig.direction === 'descending') {
      direction = 'ascending';
    } else {
      // Standard-Sortierrichtung für neue Spalten
      if (clickedKey === 'score' || clickedKey === 'songsCleared') {
        direction = 'descending'; // Score und Songs standardmäßig absteigend
      } else if (clickedKey === 'totalTimeMs' || clickedKey === 'avgTime') {
        direction = 'ascending'; // Zeiten standardmäßig aufsteigend
      }
      // Für playerName, category etc. bleibt es 'ascending'
    }
    setSortConfig({ key: clickedKey, direction });
  };

  const renderHighscoreTable = (list, mode) => {
    if (!list || list.length === 0) {
      return <p className="text-gray-400 mt-6 text-center">Noch keine Highscores für diese Auswahl vorhanden.</p>;
    }
    console.log(`Rendering table for mode: ${mode}, data:`, list); // Logge die gesamte Liste
    if (list.length > 0) console.log("First entry example:", list[0]); // Logge den ersten Eintrag

    let columns = [];
    if (mode.startsWith('timetrial_')) {
      columns = [
        { header: '#', key: null, sortable: false, accessor: (entry, index) => index + 1, className: "w-12 text-center py-3 px-2" },
        { header: 'Name', key: 'playerName', sortable: true, accessor: 'playerName', className: "py-3 px-3 min-w-[150px]" },
        { header: 'Score', key: 'score', sortable: true, accessor: 'score', className: "py-3 px-3 text-right" },
        { header: 'Gesamtzeit', key: 'totalTimeMs', sortable: true, accessor: 'totalTimeMs', accessorFormat: msToString, className: "py-3 px-3 text-right" },
        { header: 'Ø Zeit/Song', key: 'avgTime', sortable: true, accessor: (entry) => entry.correctlyGuessed > 0 ? (entry.totalTimeMs / entry.correctlyGuessed) : Infinity, accessorFormat: msToString, className: "py-3 px-3 text-right" },
        { header: 'Kategorie', key: 'category', sortable: true, accessor: 'category', accessorFormat: (val) => val === 'mixed' ? 'Gemischt' : val, className: "py-3 px-3 text-center" },
        { header: 'Datum', key: 'timestamp', sortable: true, accessor: 'timestamp', accessorFormat: formatDate, className: "py-3 px-3 text-center" }
      ];
    } else if (mode === 'survival') {
      columns = [
        { header: '#', key: null, sortable: false, accessor: (entry, index) => index + 1, className: "w-12 text-center py-3 px-2" },
        { header: 'Name', key: 'playerName', sortable: true, accessor: 'playerName', className: "py-3 px-3 min-w-[150px]" },
        { header: 'Songs', key: 'songsCleared', sortable: true, accessor: 'songsCleared', className: "py-3 px-3 text-right" },
        { header: 'Score', key: 'score', sortable: true, accessor: 'score', className: "py-3 px-3 text-right" },
        { header: 'Kategorie', key: 'category', sortable: true, accessor: 'category', accessorFormat: (val) => val === 'mixed' ? 'Gemischt' : val, className: "py-3 px-3 text-center" },
        { header: 'Datum', key: 'timestamp', sortable: true, accessor: 'timestamp', accessorFormat: formatDate, className: "py-3 px-3 text-center" }
      ];
    }

    return (
      <div className="overflow-x-auto mt-4 shadow-md rounded-lg">
      <table className="min-w-full bg-gray-850 border border-gray-700"> {/* Leichter Hintergrund für die Tabelle selbst */}
      <thead className="bg-gray-700">
      <tr>
      {columns.map((col) => (
        <th
        key={col.header}
        scope="col"
        className={`px-3 py-3.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider ${col.className || ''} ${col.sortable ? 'cursor-pointer hover:bg-gray-600 transition-colors' : ''}`}
        onClick={col.sortable ? () => requestSort(col.key) : undefined}
        >
        <div className="flex items-center">
        {col.header}
        {col.sortable && sortConfig.key === col.key && (
          <span className="ml-1.5 text-gray-400"> {/* Textfarbe des Icons angepasst */}
          {sortConfig.direction === 'ascending' ? '▲' : '▼'}
          </span>
        )}
        </div>
        </th>
      ))}
      </tr>
      </thead>
      <tbody className="divide-y divide-gray-700 bg-gray-800"> {/* Hintergrund für den Body */}
      {list.map((entry, index) => (
        <tr key={entry.id || index} className="hover:bg-gray-750 transition-colors duration-100">
        {columns.map((col, colIndex) => {
          let cellValue;
          if (typeof col.accessor === 'function') {
            cellValue = col.accessor(entry, index);
          } else if (typeof col.accessor === 'string') {
            cellValue = entry[col.accessor];
          } else {
            cellValue = ''; // Sollte nicht passieren
          }

          // Formattierung nur anwenden, wenn accessorFormat existiert UND der Wert nicht speziell N/A ist
          if (col.accessorFormat && cellValue !== 'N/A' && cellValue !== Infinity) {
            cellValue = col.accessorFormat(cellValue);
          } else if (cellValue === Infinity) { // Spezielle Behandlung für Infinity (von avgTime)
            cellValue = 'N/A';
          }

          return (
            <td key={`${col.header}-${entry.id || index}-${colIndex}`} className={`px-3 py-4 whitespace-nowrap text-sm text-gray-100 ${col.className || ''}`}> {/* Etwas mehr Padding in Zellen */}
            {cellValue}
            </td>
          );
        })}
        </tr>
      ))}
      </tbody>
      </table>
      </div>
    );
  };
  // --- Lade- und Fehlerzustände ---
  if (isLoading) {
    return (
      //<QuizLayout>
      <Card className="text-center p-8">
      <p className="text-xl text-gray-400">Lade Highscores...</p>
      </Card>
      //</QuizLayout>
    );
  }

  if (error) {
    return (
      //<QuizLayout>
      <Card className="text-center p-8">
      <p className="text-xl text-red-400 font-semibold">Fehler beim Laden der Highscores:</p>
      <p className="text-gray-300 mt-2">{error}</p>
      {/* Optional: Button zum erneuten Versuch, fetchHighscores erneut aufzurufen */}
      {/* <Button onClick={fetchHighscores} className="mt-4">Erneut versuchen</Button> */}
      </Card>
      //</QuizLayout>
    );
  }

  // --- Haupt-JSX der Komponente ---
  return (
    //<QuizLayout>
    <Card className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
    <h1 className="text-3xl sm:text-4xl font-bold text-center text-blue-400 mb-8">
    🏆 Highscores 🏆
    </h1>

    {/* Tab-Navigation */}
    <div className="flex justify-center border-b border-gray-700 mb-6">
    {TT_HS_QUESTION_COUNTS.map(count => (
      <Button
        key={`timetrial_${count}`}
        variant={activeTab === `timetrial_${count}` ? 'primary' : 'ghost'}
        onClick={() => setActiveTab(`timetrial_${count}`)}
        className={`py-2.5 px-5 text-sm sm:text-base font-medium rounded-t-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          ${activeTab !== `timetrial_${count}` ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-blue-600 text-white'}`}
      >
        TimeTrial {count}
      </Button>
    ))}
    <Button
      variant={activeTab === 'survival' ? 'primary' : 'ghost'}
      onClick={() => setActiveTab('survival')}
      className={`py-2.5 px-5 text-sm sm:text-base font-medium rounded-t-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${activeTab !== 'survival' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'bg-blue-600 text-white'}`}
        >
        Survival
        </Button>
        </div>

        {/* Angezeigter Inhalt basierend auf dem aktiven Tab */}
        <div className="mt-4">
        {activeTab.startsWith('timetrial_') && (
          <div>
          <h2 className="text-2xl font-semibold text-center text-gray-100 mb-4">
            TimeTrial {activeTab.split('_')[1]} Highscores
          </h2>
          {/* Filter für TimeTrial HS */}
          <div className="flex flex-col sm:flex-row sm:justify-center sm:items-end gap-4 mb-6 p-4 bg-gray-800 rounded-lg shadow">
          <div>
          <label htmlFor="ttCategoryFilter" className="block text-xs font-medium text-gray-400 mb-1">Kategorie:</label>
          <select
          id="ttCategoryFilter"
          value={categoryFilterTT}
          onChange={(e) => setCategoryFilterTT(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-2.5 shadow-sm"
          >
          <option value="alle">Alle Kategorien</option>
          {CATEGORIES_WITH_MIXED.map(cat => (
            <option key={cat} value={cat}>{cat === 'mixed' ? 'Gemischt' : cat}</option>
          ))}
          </select>
          </div>
          </div>
          {renderHighscoreTable(sortedTimeTrialScores, activeTab)}
          </div>
        )}

        {activeTab === 'survival' && (
          <div>
          <h2 className="text-2xl font-semibold text-center text-gray-100 mb-4">Survival Highscores</h2>
          {/* Filter für Survival */}
          <div className="flex flex-col sm:flex-row sm:justify-center sm:items-end gap-4 mb-6 p-4 bg-gray-800 rounded-lg shadow">
          <div>
          <label htmlFor="survivalCategoryFilter" className="block text-xs font-medium text-gray-400 mb-1">Kategorie:</label>
          <select
          id="survivalCategoryFilter"
          value={categoryFilterSurvival}
          onChange={(e) => setCategoryFilterSurvival(e.target.value)}
          className="bg-gray-700 border-gray-600 text-white text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-auto p-2.5 shadow-sm"
          >
          <option value="alle">Alle Kategorien</option>
          {CATEGORIES_WITH_MIXED.map(cat => (
            <option key={cat} value={cat}>{cat === 'mixed' ? 'Gemischt' : cat}</option>
          ))}
          </select>
          </div>
          </div>
          {renderHighscoreTable(sortedSurvivalScores, 'survival')}
          </div>
        )}
        </div>
        </Card>
        //</QuizLayout>
  );
} // Ende der HighscoreView Komponente
