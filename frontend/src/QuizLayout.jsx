// frontend/src/QuizLayout.jsx
import { useState } from 'react'; // useState importieren
import Header from './components/Header';
import { Link } from 'react-router-dom';
import Modal from './components/Modal'; // Deine Modal-Komponente importieren
import Button from './components/Button'; // Deine Button-Komponente importieren

const APP_VERSION = "1.1"; // Definiere die Version hier

const CHANGELOG_CONTENT = `
### Version 1.1
- Scoring und Highscore-System implementiert
- Zahlreiche Bugfixes und Stabilitätsverbesserungen (Frontend & Backend)
- "Freemode" zu "Survival"-Modus umbenannt und überarbeitet
- Tipp-Button und überarbeitetes Tipp-System (kostenpflichtig)
- Informationen zu den Spielmodi per Modal in den Einstellungen hinzugefügt
- Quiz-Einstellungen (SoloQuizConfig) visuell und funktional verbessert
- Highscore-Ansicht mit Tabs, Filtern und Sortierung hinzugefügt
- Kontextbezogene Autocomplete-Vorschläge im Quiz
- Backend-Stabilität und Datenmanagement verbessert
- Übungsmodus konzipiert und implementiert
`; // Optional: Weitere Punkte aus meiner vorherigen Liste ergänzen

export default function QuizLayout({ children }) {
  const [showChangelogModal, setShowChangelogModal] = useState(false);

  return (
    <> {/* React Fragment, da wir jetzt ein Modal als Geschwister zum Haupt-Div haben */}
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
    <Header />
    <main className="p-4 flex-grow flex justify-center items-start sm:items-center">
    <div className="w-full max-w-4xl">
    {children}
    </div>
    </main>
    <footer className="text-center p-4 border-t border-gray-700 text-xs sm:text-sm text-gray-400 mt-auto">
    <div className="space-x-3 mb-1"> {/* space-x für Abstand zwischen Links/Button */}
    <Link to="/impressum" className="hover:text-blue-300">Impressum</Link>
    <span className="text-gray-500">|</span> {/* Trenner */}
    <Link to="/datenschutz" className="hover:text-blue-300">Datenschutz</Link>
    <span className="text-gray-500">|</span> {/* Trenner */}
    <button
    onClick={() => setShowChangelogModal(true)}
    className="hover:text-blue-300 focus:outline-none"
    aria-label="Changelog anzeigen"
    >
    Version {APP_VERSION}
    </button>
    </div>
    <p className="mt-1">© {new Date().getFullYear()} Philipp Noppenberger / Nobbys Quiz</p>
    </footer>
    </div>

    {/* Changelog Modal */}
    {showChangelogModal && (
      <Modal onClose={() => setShowChangelogModal(false)} title={`Changelog - Version ${APP_VERSION}`}>
      {/* Einfache Darstellung des Changelogs mit manueller Formatierung für Überschriften/Listen */}
      <div className="prose prose-sm prose-invert max-w-none whitespace-pre-line overflow-y-auto max-h-[60vh] p-1 text-left">
      {CHANGELOG_CONTENT.trim().split('\n').map((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold text-blue-300 mt-4 mb-1.5">{trimmedLine.substring(4)}</h3>;
        } else if (trimmedLine.startsWith('- ')) {
          // Für Listenelemente ein <ul> um die Gruppe von '-' legen oder sie einfach als <p> mit Einzug darstellen.
          // Für eine echte Liste wäre mehr Logik nötig, um zu erkennen, wann eine Liste beginnt/endet.
          // Einfachere Variante:
          return <p key={index} className="ml-4 my-0.5 before:content-['•'] before:mr-2">{trimmedLine.substring(2)}</p>;
        } else if (trimmedLine === '') {
          return <div key={index} className="h-2"></div>; // Leere Zeile als kleiner Abstand
        }
        return <p key={index} className="my-0.5">{trimmedLine}</p>;
      })}
      </div>
      <div className="mt-6 flex justify-end"> {/* Button rechtsbündig */}
      <Button onClick={() => setShowChangelogModal(false)}>Schließen</Button>
      </div>
      </Modal>
    )}
    </>
  );
}
