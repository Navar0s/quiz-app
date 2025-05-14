import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './components/Card';
import Select from './components/Select';
import Button from './components/Button';
import { useTheme } from './theme-context';

export default function BuzzerQuizConfig() {
    const [categories, setCategories] = useState([]);
    const [count, setCount] = useState(10);
    const { theme } = useTheme();
    const navigate = useNavigate();

    const toggleCategory = (cat) => {
        setCategories(prev =>
        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const startGame = () => {
        const query = new URLSearchParams();
        query.set('categories', categories.join(','));
        query.set('count', count);
        navigate(`/buzzer?${query.toString()}`);
    };

    return (
        <Card>
        <h2>🛠️ Buzzer-Spiel konfigurieren</h2>

        <div style={{ marginTop: '1rem' }}>
        <p>Kategorien:</p>
        {['Film', 'Serie', 'Game'].map(cat => (
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
        <p>Anzahl Fragen:</p>
        <Select
        value={count}
        onChange={e => setCount(Number(e.target.value))}
        options={[10, 15, 20, 25, 30]}
        />
        </div>

        <Button
        onClick={startGame}
        style={{ marginTop: '2rem' }}
        disabled={categories.length === 0}
        >
        🎮 Spiel starten
        </Button>
        </Card>
    );
}
