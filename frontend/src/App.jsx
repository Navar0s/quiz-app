// frontend/src/App.jsx
import { Routes, Route, useLocation } from 'react-router-dom';

// Layout-Komponente importieren
import QuizLayout from './QuizLayout'; // Annahme: Liegt in src/QuizLayout.jsx

// Seiten-Komponenten importieren
import QuizStartScreen from './QuizStartScreen';
import SoloQuizConfig from './SoloQuizConfig';
import GamemasterQuizConfig from './GamemasterQuizConfig';
// BuzzerQuizConfig wurde entfernt, da der Button dafür entfernt wurde
// import BuzzerQuizConfig from './BuzzerQuizConfig';

import QuizDataEditor from './QuizDataEditor';
import HighscoreView from './HighscoreView';
import Impressum from './Impressum';
import Datenschutz from './Datenschutz';

// Spiel-Modi Komponenten importieren
import SoloQuiz from './SoloQuiz';
// Die folgenden sind Beispiele, falls du sie später wieder aktivierst:
// import GamemasterQuiz from './GamemasterQuiz';
// import BuzzerQuiz from './BuzzerQuiz';
// import BuzzerClient from './BuzzerClient';

export default function App() {
  const location = useLocation();
  console.log("[App.jsx] App Komponente gerendert. Aktueller Pfad:", location.pathname);

  return (
    <Routes>
    {/* Routen, die das allgemeine QuizLayout (mit Header/Footer) verwenden */}
    <Route path="/" element={<QuizLayout><QuizStartScreen /></QuizLayout>} />
    <Route path="/solo-config" element={<QuizLayout><SoloQuizConfig /></QuizLayout>} />
    <Route path="/gamemaster-config" element={<QuizLayout><GamemasterQuizConfig /></QuizLayout>} />
    {/* <Route path="/buzzer-config" element={<QuizLayout><BuzzerQuizConfig /></QuizLayout>} /> // Auskommentiert */}

    <Route path="/editor" element={<QuizLayout><QuizDataEditor /></QuizLayout>} />
    <Route path="/highscore" element={<QuizLayout><HighscoreView /></QuizLayout>} />
    <Route path="/impressum" element={<QuizLayout><Impressum /></QuizLayout>} />
    <Route path="/datenschutz" element={<QuizLayout><Datenschutz /></QuizLayout>} />

    {/* Routen für die eigentlichen Quiz-Spiele.
      Diese könnten ihr eigenes Layout verwenden oder QuizLayout intern anders nutzen.
      Wenn sie auch den globalen Header/Footer von dem hier importierten QuizLayout
      benötigen, müssten sie ebenfalls umschlossen werden.
      SoloQuiz verwendet QuizLayout bereits intern.
      */}
      <Route path="/solo" element={<SoloQuiz />} />
      {/* <Route path="/gamemaster" element={<GamemasterQuiz />} /> */}
      {/* <Route path="/buzzer" element={<BuzzerQuiz />} /> */}
      {/* <Route path="/client" element={<BuzzerClient />} /> */}

      {/* Fallback-Route oder 404-Seite (optional)
        Wenn keine der obigen Routen passt, könntest du hier eine "Seite nicht gefunden"-Komponente rendern.
        Beispiel: <Route path="*" element={<NotFoundPage />} />
        */}
        </Routes>
  );
}
