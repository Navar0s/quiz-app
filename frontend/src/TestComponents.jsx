import { useState } from 'react';
import Card from './components/Card';
import Input from './components/Input';
import Select from './components/Select';
import ToggleSwitch from './components/ToggleSwitch';
import Button from './components/Button';
import Modal from './components/Modal';

export default function TestComponents() {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [soundOn, setSoundOn] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <Card>
        <h2>🧪 Komponenten-Demo</h2>

        <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name eingeben"
        />

        <Select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        options={[
            { value: '', label: 'Kategorie wählen' },
            { value: 'film', label: '🎬 Film' },
            { value: 'serie', label: '📺 Serie' },
            { value: 'game', label: '🎮 Game' }
        ]}
        />

        <div style={{ marginTop: '1rem' }}>
        <span style={{ marginRight: '1rem' }}>🔊 Sound:</span>
        <ToggleSwitch checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
        </div>

        <Button onClick={() => setModalOpen(true)} style={{ marginTop: '2rem' }}>
        ✅ Modal öffnen
        </Button>

        <Modal visible={modalOpen} onClose={() => setModalOpen(false)}>
        <h3>🎉 Demo erfolgreich!</h3>
        <p>Du hast alle Komponenten korrekt eingebunden.</p>
        </Modal>
        </Card>
    );
}
