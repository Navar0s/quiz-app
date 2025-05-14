// src/config/quizConfig.js

export const CATEGORIES = ['Filme', 'Serien', 'Games', 'Musik', 'Sonstiges'];

// required: true -> Dieses Feld muss ausgefüllt sein, damit der Song nicht als "unvollständig" markiert wird.
// type: 'text' (default), 'number', 'textarea' (kann später für spezifischere Input-Typen im SongEditor verwendet werden)
export const metadataFieldsConfig = {
    Filme: [
        { key: 'Erscheinungsjahr', label: 'Erscheinungsjahr (Film)', type: 'number', required: true },
        { key: 'Genre', label: 'Genre (Film)', type: 'text', required: true },
        { key: 'Regie', label: 'Regisseur', type: 'text', required: false },
        { key: 'Darsteller', label: 'Darsteller (kommasepariert)', type: 'textarea', required: false },
        { key: 'Zitat', label: 'Zitat (Film)', type: 'textarea', required: false },
    ],
    Serien: [
        { key: 'Startjahr', label: 'Startjahr (Serie)', type: 'number', required: true },
        { key: 'Endjahr', label: 'Endjahr (Serie, leer lassen falls läuft)', type: 'number', required: false },
        { key: 'Genre', label: 'Genre (Serie)', type: 'text', required: true },
        { key: 'Staffelanzahl', label: 'Anzahl Staffeln', type: 'number', required: false },
        { key: 'Handlungsort', label: 'Handlungsort', type: 'text', required: false },
        { key: 'Nebencharakter', label: 'Wichtiger Nebencharakter', type: 'text', required: false },
        { key: 'Sender', label: 'Sender/Netzwerk', type: 'text', required: false },
    ],
    Games: [
        { key: 'Erscheinungsjahr', label: 'Erscheinungsjahr (Spiel)', type: 'number', required: true },
        { key: 'Genre', label: 'Genre (Spiel)', type: 'text', required: true },
        { key: 'Plattform', label: 'Plattform(en) (z.B. PC, PS5)', type: 'text', required: false },
        { key: 'Entwickler', label: 'Entwicklerstudio', type: 'text', required: false },
        { key: 'Nebenfigur', label: 'Wichtige Nebenfigur', type: 'text', required: false },
        { key: 'Publisher', label: 'Publisher', type: 'text', required: false },
    ],
    Musik: [ // Deine vorherige 'music'-Kategorie wurde hier übernommen
        { key: 'Album', label: 'Album', type: 'text', required: false },
        { key: 'Genre', label: 'Genre (Musik)', type: 'text', required: true }, // Angepasst von 'Genre (Musik)' zu 'Genre' für Konsistenz mit anderen
        // { key: 'Künstler', label: 'Künstler (falls abw. vom Hauptinterpret)', type: 'text', required: false }, // Hauptinterpret ist schon ein Feld im Song-Objekt
        // Das Jahr ist bereits ein Hauptfeld im Song-Objekt (`year`)
    ],
    Sonstiges: [ // Deine vorherige 'misc'-Kategorie wurde hier übernommen
        { key: 'Quelle', label: 'Quelle / Herkunft', type: 'text', required: false },
        { key: 'Jahr', label: 'Jahr (falls zutreffend)', type: 'number', required: false },
        { key: 'Notizen', label: 'Zusätzliche Notizen/Tipps', type: 'textarea', required: false },
    ]
};

// NEU: Score Konfiguration
export const SCORE_CONFIG = {
    Freemode: { // Bezieht sich auf 'freemode' und 'highscore' (6 Versuche HS)
        MAX_POINTS_PER_SONG: 100,
        DEDUCTION_PER_WRONG_ATTEMPT: 15,
        // MAX_TOTAL_ATTEMPTS ist bereits durch deine FREEMODE_ATTEMPTS Konstante (6) in SoloQuiz definiert.
        // 0 Punkte, wenn fails >= FREEMODE_ATTEMPTS (also 6 oder mehr Fehlversuche)
        // oder wenn im 6. Versuch falsch geraten wird.
        // `fails` zählt die Fehlversuche. Wenn `fails` 0 ist und richtig: 100 Pkt.
        // Wenn `fails` 5 ist und richtig (6. Versuch): 100 - 5*15 = 25 Pkt.
    },
    TimeTrial: { // Bezieht sich auf 'timetrial' und 'timetrialHS'
        BASE_POINTS_PER_SONG: 200,
        TIME_DEDUCTION_PER_SECOND: 1, // Abzug pro ganzer Sekunde (elapsed wird in ms sein)
        WRONG_ATTEMPT_DEDUCTION: 15,
        // DNF_TIME_PENALTY_SECONDS: 30, // Könnten wir hinzufügen, wenn ein DNF eine feste Zeitstrafe bekommen soll
    },
};

// NEU: Verfügbare Fragenanzahlen für Highscore-Modi (falls du die Auswahl dynamischer gestalten willst)
// Aktuell ist es in SoloQuizConfig fest auf 25 für HS-Modi.
// Wenn du planst, 10, 25, 50 auswählbar für HS zu machen mit getrennten Tabellen, wird das hier wichtig.
export const HIGHSCORE_QUESTION_COUNTS = [10, 25, 50]; // Beispiel
