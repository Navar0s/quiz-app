// src/components/SongEditor.jsx
import { useState, useEffect, useRef } from 'react';
import Input from './Input';
import Button from './Button';
import Select from './Select';
import Textarea from './Textarea';
import { API } from '../api'; // Dieser API-Import wird für /songs und /replace-audio etc. benötigt
import { CATEGORIES, metadataFieldsConfig } from '../config/quizConfig'; // Pfad anpassen!

const getMediaErrorDescription = (error) => { if (!error) return ''; switch (error.code) { case 1: return 'Abgebrochen'; case 2: return 'Netzwerkfehler'; case 3: return 'Dekodierfehler'; case 4: return 'Quelle nicht unterstützt'; default: return `Code ${error.code}`; } };

export default function SongEditor({ song, onUpdate, onDelete }) {
    const [expanded, setExpanded] = useState(false);
    const [altTitlesText, setAltTitlesText] = useState('');
    const [edited, setEdited] = useState({
        _id: null, title: '', category: CATEGORIES[0], startTime: 0, metadata: {}, audio: null, filename: null, alternativeTitles: [], isNew: false
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [audioActionStatus, setAudioActionStatus] = useState('');
    const [audioActionError, setAudioActionError] = useState('');

    const replaceAudioInputRef = useRef(null);
    const audioPlayerRef = useRef(null);

    useEffect(() => {
        if (song) {
            setEdited({
                _id: song._id,
                title: song.title || '',
                category: CATEGORIES.includes(song.category) ? song.category : CATEGORIES[0],
                      startTime: song.startTime || 0,
                      metadata: song.metadata || {},
                      audio: song.audio || null, // z.B. "/audio/song.mp3"
                      filename: song.filename || null,
                      alternativeTitles: Array.isArray(song.alternativeTitles) ? song.alternativeTitles : [],
                      isNew: song.isNew || false,
            });
            setAltTitlesText(Array.isArray(song.alternativeTitles) ? song.alternativeTitles.join('\n') : '');
        } else {
            setEdited({ _id: null, title: '', category: CATEGORIES[0], startTime: 0, metadata: {}, audio: null, filename: null, alternativeTitles: [], isNew: true });
            setAltTitlesText('');
        }
        setError(''); setAudioActionError(''); setAudioActionStatus('');
    }, [song]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEdited(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleMetadataChange = (key, value) => {
        setEdited(prev => ({
            ...prev,
            metadata: { ...(prev.metadata || {}), [key]: value }
        }));
    };

    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        setEdited(prev => ({
            ...prev,
            category: newCategory,
            metadata: {}
        }));
    };

    const handleSave = async () => {
        setSaving(true); setError(''); setAudioActionError(''); setAudioActionStatus('');
        try {
            const dataToSend = {
                title: edited.title,
                category: edited.category,
                startTime: edited.startTime,
                alternativeTitles: altTitlesText.split('\n').map(t => t.trim()).filter(t => t !== ''),
                metadata: edited.metadata,
            };
            const res = await fetch(`${API}/songs/${edited._id}`, { // API ist korrekt für den Backend-Endpunkt
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend)
            });
            const responseData = await res.json().catch(() => ({ error: "Antwort vom Server war kein valides JSON."}));
            if (res.ok) {
                setError('✅ Metadaten gespeichert!');
                onUpdate();
                setTimeout(() => setError(''), 3000);
            } else {
                setError(`❌ Fehler ${res.status}: ${responseData.error || responseData.message || 'Unbekannter Speicherfehler'}`);
            }
        } catch (err) {
            console.error("[SongEditor] Netzwerkfehler beim Speichern:", err)
            setError('❌ Netzwerkfehler beim Speichern.');
        }
        finally { setSaving(false); }
    };

    const handleDeleteAudioFile = async () => {
        if (!edited._id || !edited.filename) { setAudioActionError("Keine Audiodatei zum Löschen."); return; }
        if (!window.confirm(`Audiodatei "${edited.filename}" löschen? Song-Eintrag bleibt.`)) return;
        setAudioActionStatus('Lösche Audiodatei...'); setAudioActionError('');
        try {
            const res = await fetch(`${API}/songs/${edited._id}/audio`, { method: 'DELETE' }); // API ist korrekt
            const responseData = await res.json().catch(() => ({ error: "Antwort vom Server war kein valides JSON."}));
            if (res.ok) {
                setAudioActionStatus(`✅ Audiodatei gelöscht.`);
                setEdited(prev => ({ ...prev, audio: null, filename: null }));
                if (audioPlayerRef.current) { audioPlayerRef.current.src = ''; audioPlayerRef.current.load(); }
                onUpdate(); setTimeout(() => setAudioActionStatus(''), 3000);
            } else { setAudioActionError(`❌ Fehler Löschen: ${responseData.error || responseData.message}`); }
        } catch (err) { setAudioActionError("❌ Netzwerkfehler Löschen."); }
    };

    const handleTriggerReplaceAudioInput = () => { replaceAudioInputRef.current?.click(); };

    const handleNewAudioFileSelected = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!edited._id) { setAudioActionError("Song-ID fehlt."); return; }
        setAudioActionStatus(`Lade "${file.name}" hoch...`); setAudioActionError('');
        const formData = new FormData();
        formData.append('newAudioFile', file);
        try {
            const res = await fetch(`${API}/songs/${edited._id}/replace-audio`, { method: 'POST', body: formData }); // API ist korrekt
            const responseData = await res.json().catch(() => ({ error: "Antwort vom Server war kein valides JSON."}));
            if (res.ok && responseData.song) {
                setAudioActionStatus(`✅ Datei "${responseData.song.filename}" ersetzt.`);
                setEdited(prev => ({ ...prev, audio: responseData.song.audio, filename: responseData.song.filename }));
                // KORREKTUR HIER für die Player-Source nach dem Upload einer neuen Datei:
                if (audioPlayerRef.current) {
                    const newAudioPath = responseData.song.audio; // z.B. "/audio/neuedatei.mp3"
                    // Verwende window.location.origin direkt für die Audioquelle
                    audioPlayerRef.current.src = `${window.location.origin}${newAudioPath}?t=${new Date().getTime()}`;
                    audioPlayerRef.current.load();
                    audioPlayerRef.current.play().catch(e => console.warn("Autoplay nach Ersatz fehlgeschlagen", e));
                }
                onUpdate(); setTimeout(() => setAudioActionStatus(''), 4000);
            } else { setAudioActionError(`❌ Fehler (${res.status}): ${responseData.error || responseData.message || 'Upload fehlgeschlagen.'}`); }
        } catch (err) { setAudioActionError("❌ Netzwerkfehler Upload."); }
        finally { if(event.target) event.target.value = null; }
    };

    // KORRIGIERTE normalizeAudioUrl Funktion
    const normalizeAudioUrl = (audioPath) => {
        if (!audioPath || typeof audioPath !== 'string') return undefined;

        // Wenn audioPath bereits eine volle URL ist (http/https)
        if (audioPath.startsWith('http')) {
            return audioPath;
        }

        // Annahme: audioPath ist ein Pfad wie "/audio/song.mp3"
        // Wir verwenden window.location.origin, da Nginx /audio direkt bedient.
        // Stelle sicher, dass der Pfad mit einem / beginnt.
        const pathSegment = audioPath.startsWith('/') ? audioPath : `/${audioPath}`;

        // Die `API`-Konstante (die `/api` enthält) wird hier NICHT verwendet.
        return `${window.location.origin}${pathSegment}`;
    };

    const currentAudioUrl = edited.audio ? `${normalizeAudioUrl(edited.audio)}?v=${Date.now()}` : undefined;

    const renderMetadataFields = () => {
        const categoryConfig = metadataFieldsConfig[edited.category];
        if (!categoryConfig || categoryConfig.length === 0) {
            return <p className="text-sm text-gray-500 italic">Keine spezifischen Metadaten für Kategorie "{edited.category}" definiert.</p>;
        }
        return categoryConfig.map(field => {
            const InputComponent = field.type === 'textarea' ? Textarea : Input;
            const inputType = field.type === 'textarea' ? undefined : (field.type || 'text');
            return (
                <div key={field.key} className="mb-3">
                <label htmlFor={`metadata-${field.key}-${edited._id}`} className="text-sm text-gray-300 block mb-1">
                {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                <InputComponent
                type={inputType}
                id={`metadata-${field.key}-${edited._id}`}
                name={field.key}
                value={edited.metadata?.[field.key] || ''}
                onChange={(e) => handleMetadataChange(field.key, e.target.value)}
                rows={field.type === 'textarea' ? 3 : undefined}
                className="w-full p-2 border border-gray-600 bg-gray-700 rounded text-white focus:ring-blue-500 focus:border-blue-500"
                placeholder={field.placeholder || ''}
                />
                </div>
            );
        });
    };

    return (
        <div className={`border rounded-xl p-3 sm:p-4 space-y-3 bg-gray-800 shadow-md my-2 ${edited.isNew ? 'border-yellow-500 shadow-yellow-500/30' : 'border-gray-700'}`}>
        <div className="flex justify-between items-center">
        <p className="font-semibold text-md sm:text-lg text-blue-300 truncate pr-2" title={edited.title || 'Unbenannter Song'}>
        {edited.isNew && <span className="text-xs text-yellow-400 mr-1">(NEU)</span>}
        {edited.title || song?.title || 'Unbenannter Song'}
        </p>
        <button onClick={() => setExpanded(!expanded)} className="text-blue-400 hover:text-blue-300 text-xl flex-shrink-0 p-1" title={expanded ? 'Zuklappen' : 'Bearbeiten'}>
        {expanded ? '➖' : '✏️'}
        </button>
        </div>

        {expanded && (
            <div className="space-y-4 pt-3 border-t border-gray-600">
            <h4 className="text-md font-semibold text-gray-200 border-b border-gray-500 pb-1 mb-3">Grunddaten</h4>
            <div><label className="text-sm text-gray-300">Titel <span className="text-red-500">*</span></label><Input name="title" value={edited.title} onChange={handleInputChange} required className="mt-1"/></div>
            <div>
            <label className="text-sm text-gray-300">Kategorie <span className="text-red-500">*</span></label>
            <Select value={edited.category} onChange={handleCategoryChange} options={CATEGORIES} name="category" required className="mt-1"/>
            </div>
            <div><label className="text-sm text-gray-300">Startzeit (Sekunden)</label><Input type="number" name="startTime" value={edited.startTime} onChange={handleInputChange} className="mt-1"/></div>
            <div><label className="text-sm text-gray-300">Alternative Titel (jeder Titel in einer neuen Zeile)</label><Textarea value={altTitlesText} onChange={(e) => setAltTitlesText(e.target.value)} rows={3} className="w-full mt-1"/></div>

            <h4 className="text-md font-semibold text-gray-200 border-b border-gray-500 pb-1 mb-3 mt-5">Metadaten / Tipps für Kategorie: {edited.category}</h4>
            {renderMetadataFields()}

            <h4 className="text-md font-semibold text-gray-200 border-b border-gray-500 pb-1 mb-3 mt-5">Audio-Datei</h4>
            {edited.filename ? (
                <>
                <p className="text-sm text-gray-400">Aktuelle Datei: <span className="font-mono text-indigo-300 break-all">{edited.filename}</span></p>
                {currentAudioUrl && (
                    <audio ref={audioPlayerRef} key={currentAudioUrl} src={currentAudioUrl} controls className="w-full rounded my-2" preload="metadata"
                    onError={(e) => { console.error(`[SongEditor] Audio Fehler: ${getMediaErrorDescription(e.target.error)} bei URL: ${currentAudioUrl}`, e.target.error); setAudioActionError(`Audio Fehler: ${getMediaErrorDescription(e.target.error)}`); }}
                    />
                )}
                <div className="flex gap-2 mt-2">
                <Button variant="warning" size="sm" onClick={handleTriggerReplaceAudioInput}>Datei ersetzen</Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteAudioFile}>Datei löschen</Button>
                </div>
                </>
            ) : (
                <>
                <p className="text-sm text-yellow-400">Für diesen Song ist keine Audiodatei hinterlegt.</p>
                <Button variant="primary" size="sm" onClick={handleTriggerReplaceAudioInput} className="mt-2">Audiodatei hochladen</Button>
                </>
            )}
            <input type="file" accept="audio/*" ref={replaceAudioInputRef} onChange={handleNewAudioFileSelected} className="hidden" />
            {audioActionStatus && <p className="text-sm text-green-400 mt-1">{audioActionStatus}</p>}
            {audioActionError && <p className="text-sm text-red-400 mt-1">{audioActionError}</p>}

            <div className="flex flex-col items-center mt-6 pt-3 border-t border-gray-600">
            {error && <p className={`text-center text-sm mb-2 ${error.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{error}</p>}
            <div className="flex flex-wrap justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setExpanded(false)} size="sm">Schließen</Button>
            <Button variant="success" onClick={handleSave} disabled={saving || !edited.title || !edited.category} size="sm">{saving ? 'Speichert...' : '💾 Metadaten Speichern'}</Button>
            <Button variant="destructive" onClick={() => {if(window.confirm(`Song "${edited.title || song.title}" wirklich KOMPLETT löschen? Dies kann nicht rückgängig gemacht werden.`)) {onDelete(edited._id)}}} size="sm">🗑️ Ganzen Song Löschen</Button>
            </div>
            </div>
            </div>
        )}
        </div>
    );
}
