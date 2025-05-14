// frontend/src/QuizLayout.jsx
import Header from './components/Header'; // Pfad zu deinem Header prüfen
import { Link } from 'react-router-dom'; // << PRÜFE DIESEN IMPORT!

export default function QuizLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
    <Header />
    <main className="p-4 flex-grow flex justify-center items-start sm:items-center">
    <div className="w-full max-w-4xl">
    {children}
    </div>
    </main>
    <footer className="text-center p-4 border-t border-gray-700 text-xs sm:text-sm text-gray-400 mt-auto">
    <Link to="/impressum" className="hover:text-blue-300">Impressum</Link> {/* Link wird hier verwendet */}
    <Link to="/datenschutz" className="hover:text-blue-300 ml-1">Datenschutz</Link>
    {/* <Link to="/datenschutz" className="hover:text-blue-300 ml-2">Datenschutz</Link> */} {/* Link wird hier verwendet */}
    <p className="mt-1">© {new Date().getFullYear()} Philipp Noppenberger / Nobbys Quiz</p>
    </footer>
    </div>
  );
}
