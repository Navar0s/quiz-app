import { useNavigate } from 'react-router-dom';

export default function BackButton() {
    const navigate = useNavigate();

    return (
        <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-400 hover:text-white underline"
        >
        ← Zurück zur Startseite
        </button>
    );
}
