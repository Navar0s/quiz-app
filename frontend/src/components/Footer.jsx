// frontend/src/components/Footer.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom'; // Falls du React Router für Impressum etc. nutzt
import Modal from './Modal'; // Deine Modal-Komponente

const APP_VERSION = "1.1"; // Definiere die Version hier

// Das Changelog als String oder Array von Strings
const CHANGELOG_CONTENT = `
### Version 1.1
- Scoring und Highscore-System implementiert
- Zahlreiche Bugfixes und Stabilitätsverbesserungen (Frontend & Backend)
- "Freemode" zu "Survival"-Modus umbenannt und überarbeitet
- Tipp-Button und überarbeitetes Tipp-System
- Informationen zu den Spielmodi per Modal in den Einstellungen hinzugefügt
- Quiz-Einstellungen visuell und funktional verbessert
- Highscore-Ansicht mit Tabs, Filtern und Sortierung hinzugefügt
- Kontextbezogene Autocomplete-Vorschläge im Quiz
- Backend-Stabilität und Datenmanagement verbessert
- Übungsmodus konzipiert und implementiert
`;
// Optional: Für bessere Formatierung im Modal, wenn du Markdown parsen willst oder Zeilenumbrüche als <br> brauchst.
// Für den Anfang reicht ein String mit \n, wenn dein Modal `whitespace-pre-line` unterstützt.

export default function Footer() {
    const [showChangelogModal, setShowChangelogModal] = useState(false);

    return (
        <>
        <footer className="bg-gray-800 text-gray-400 text-center p-4 mt-auto text-xs">
        <div className="container mx-auto">
        <Link to="/impressum" className="hover:text-white px-2">Impressum</Link> |
        <Link to="/datenschutz" className="hover:text-white px-2">Datenschutz</Link> |
        <button
        onClick={() => setShowChangelogModal(true)}
        className="hover:text-white px-2 focus:outline-none"
        aria-label="Changelog anzeigen"
        >
        Version {APP_VERSION}
        </button>
        </div>
        </footer>

        {showChangelogModal && (
            <Modal onClose={() => setShowChangelogModal(false)} title={`Changelog - Version ${APP_VERSION}`}>
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-line overflow-y-auto max-h-[60vh] p-1">
            {/*
                Wenn CHANGELOG_CONTENT einfacher Text mit \n ist, reicht whitespace-pre-line.
                Für echtes Markdown-Rendering bräuchtest du eine Bibliothek wie 'react-markdown'.
        */}
        {CHANGELOG_CONTENT.trim().split('\n').map((line, index) => {
            if (line.startsWith('### ')) {
                return <h3 key={index} className="text-lg font-semibold text-blue-300 mt-3 mb-1">{line.substring(4)}</h3>;
            } else if (line.startsWith('- ')) {
                return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>;
            }
            return <p key={index} className="my-0.5">{line || <br />}</p>; // Leere Zeilen für Abstand
        })}
        </div>
        <div className="mt-6 text-right">
        <Button onClick={() => setShowChangelogModal(false)}>Schließen</Button>
        </div>
        </Modal>
        )}
        </>
    );
}
