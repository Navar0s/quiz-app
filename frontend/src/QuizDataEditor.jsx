// frontend/src/QuizDataEditor.jsx
import { useEffect, useState, useCallback } from 'react';
import EditorGuard from './components/EditorGuard';
import SongEditor  from './components/SongEditor';
//import QuizLayout  from './QuizLayout';
import Card        from './components/Card';
import Input       from './components/Input';
import Select      from './components/Select';
import Button      from './components/Button';
import { API }     from './api';
import path from 'path-browserify';
import { CATEGORIES as EDITOR_CATEGORIES, metadataFieldsConfig } from './config/quizConfig'; // Pfad anpassen!
import { FlagIcon, SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';


export default function QuizDataEditor() {
  console.log('[QuizDataEditor] Hauptkomponente QuizDataEditor gerendert.');
  return (
    <EditorGuard>
    <InnerEditor />
    </EditorGuard>
  );
}

function InnerEditor() {
  console.log('[QuizDataEditor] InnerEditor Komponente gerendert - ANFANG');

  const [title, setTitle]       = useState('');
  const [category, setCategory] = useState(EDITOR_CATEGORIES[0]);
  const [files, setFiles]       = useState([]);
  const [status, setStatus]     = useState('');
  const [songs, setSongs]       = useState([]);
  const [filter, setFilter]     = useState('Alle');
  const [query, setQuery]       = useState('');
  const [drag, setDrag]         = useState(false);
  const [loading, setLoading]   = useState(true);
  const [showOnlyReported, setShowOnlyReported] = useState(false);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);

  const fetchSongs = useCallback(async (showLoadingMessage = true) => {
    console.log('[QuizDataEditor] fetchSongs aufgerufen.');
    if (showLoadingMessage) setStatus('Lade Songs...');
    setLoading(true);
    try {
      const res = await fetch(`${API}/songs`);
      if (!res.ok) throw new Error(`HTTP Fehler ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSongs(data.map(s => ({
          ...s,
          _id: s._id || s.id,
          reportedIssues: Array.isArray(s.reportedIssues) ? s.reportedIssues : [],
                                isNew: s.isNew === undefined ? false : s.isNew
        })));
        if (showLoadingMessage) setStatus('');
      } else {
        setStatus('❌ Fehler: Unerwartetes Datenformat'); setSongs([]);
      }
    } catch(err) {
      setStatus(`❌ Fehler beim Laden: ${err.message}`); setSongs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  const handleFileSelect = (fileListFromInput) => {
    const newFilesArray = Array.from(fileListFromInput);
    let newStatusMessages = "";
    const existingFilenamesInDB = new Set(songs.map(s => s.filename).filter(Boolean));
    const currentSelectedFilenames = new Set(files.map(f => f.name)); // Für bereits im State befindliche Dateien

    const trulyNewFiles = newFilesArray.filter(f => {
      if (existingFilenamesInDB.has(f.name)) {
        newStatusMessages += `⚠️ Datei "${f.name}" existiert schon in DB. `; return false;
      }
      if (currentSelectedFilenames.has(f.name)) { // Prüfen gegen bereits ausgewählte
        return false;
      }
      return true;
    });

    if (trulyNewFiles.length > 0) {
      setFiles(prevFiles => [...prevFiles, ...trulyNewFiles]);
    }
    if(newStatusMessages) {
      setStatus(prev => prev.replace(/⚠️ Bitte Dateien wählen.*/, '').trim() + " " + newStatusMessages.trim());
    } else if (newFilesArray.length > 0 && trulyNewFiles.length === 0 && !status.includes("existiert schon")) {
      setStatus(prev => prev.replace(/⚠️ Bitte Dateien wählen.*/, '').trim() + " ⚠️ Alle neu ausgewählten Dateien sind Duplikate oder bereits vorhanden.");
    }
  };

  const handleDrop = e => {
    e.preventDefault(); e.stopPropagation(); setDrag(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files); e.dataTransfer.clearData();
    }
  };

  const commonDragEvents = {
    onDragOver: (e) => { e.preventDefault(); e.stopPropagation(); if(!drag) setDrag(true); },
    onDragEnter: (e) => { e.preventDefault(); e.stopPropagation(); if(!drag) setDrag(true); },
    onDragLeave: (e) => { e.preventDefault(); e.stopPropagation(); setDrag(false); },
    onDrop: handleDrop,
  };

  const handleUploadNewSongs = async () => {
    if (!files.length) { setStatus('⚠️ Bitte Dateien wählen oder hierhin ziehen.'); return; }
    setStatus(`Lade ${files.length} Datei(en) hoch...`); setLoading(true);
    const uploadPromises = files.map(file => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title.trim() || path.parse(file.name).name);
      fd.append('category', category || EDITOR_CATEGORIES[0]);
      return fetch(`${API}/upload`, { method: 'POST', body: fd })
      .then(async res => {
        const resData = await res.json().catch(() => ({ error: `Ungültige JSON-Antwort von Server bei ${file.name}` }));
        if (!res.ok) throw new Error(resData.error || `Upload fehlgeschlagen für ${file.name} (${res.status})`);
        return { status: 'fulfilled', value: resData, filename: file.name };
      })
      .catch(uploadError => ({ status: 'rejected', reason: uploadError.message || 'Unbekannter Upload-Fehler', filename: file.name }));
    });
    const results = await Promise.all(uploadPromises);
    let successCount = 0; let errorMessages = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') successCount++;
      else errorMessages.push(`Fehler bei "${result.filename}": ${result.reason}`);
    });
    if (errorMessages.length > 0) setStatus(`⚠️ ${successCount} von ${files.length} hochgeladen. Fehler: ${errorMessages.join('; ')}`);
    else setStatus(`✅ ${successCount} Datei(en) erfolgreich hochgeladen.`);
    setFiles([]); setTitle(''); await fetchSongs(false);
    setTimeout(() => setStatus(prevStatus => ((prevStatus.startsWith('✅') || prevStatus.startsWith('⚠️')) && !prevStatus.includes("existiert schon")) ? '' : prevStatus), 7000);
    setLoading(false);
  };

  const handleExport = () => {
    if (!songs || songs.length === 0) { setStatus('⚠️ Keine Songs zum Exportieren.'); setTimeout(() => setStatus(''), 3000); return; }
    try {
      const blob = new Blob([JSON.stringify(songs, null, 2)], { type:'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `nobbysquiz-songs-export-${new Date().toISOString().split('T')[0]}.json` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
      setStatus('📤 Export gestartet...'); setTimeout(() => setStatus(''), 3000);
    } catch (err) { setStatus('❌ Fehler beim Exportieren'); }
  };

  const handleImport = async e => {
    setStatus('⚠️ Import-Funktion noch nicht implementiert.'); setTimeout(() => setStatus(''), 3000);
    if(e.target) e.target.value = null;
  };

    const handleDeleteSongEntry = async (id, songTitle) => {
      if (!window.confirm(`Sicher Song "${songTitle}" löschen?`)) return;
      setStatus('Lösche Song...'); setLoading(true);
      try {
        const res = await fetch(`${API}/songs/${id}`, { method:'DELETE' });
        const resData = await res.json().catch(() => ({message: "Antwort war kein JSON"}));
        if (!res.ok) throw new Error(resData.error || resData.message || `Löschen fehlgeschlagen: ${res.statusText}`);
        setStatus('✅ Song gelöscht.'); await fetchSongs(false); setTimeout(() => setStatus(''), 3000);
      } catch (err) { setStatus(`❌ Fehler beim Löschen: ${err.message}`); }
      finally { setLoading(false); }
    };

    const normalizeText = (text) => text ? text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';

    const checkHasMissingRequiredMetadata = useCallback((song) => {
      if (!song || !song.category || !metadataFieldsConfig[song.category]) return false;
      const categoryFields = metadataFieldsConfig[song.category];
      const requiredFields = categoryFields.filter(field => field.required);
      if (requiredFields.length === 0) return false;
      for (const field of requiredFields) {
        if (!song.metadata || song.metadata[field.key] === undefined || song.metadata[field.key] === null || String(song.metadata[field.key]).trim() === '') {
          return true;
        }
      }
      return false;
    }, []); // metadataFieldsConfig ist ein Import und ändert sich nicht zur Laufzeit

    const visibleSongs = songs
    .filter(s => filter === 'Alle' || s.category === filter)
    .filter(s => {
      const normalizedQuery = normalizeText(query);
      if (!normalizedQuery) return true;
      const normalizedTitle = normalizeText(s.title || '');
      const titleMatch = normalizedTitle.includes(normalizedQuery);
      let altMatch = false;
      if (Array.isArray(s.alternativeTitles)) {
        altMatch = s.alternativeTitles.some(alt => normalizeText(alt || '').includes(normalizedQuery));
      }
      return titleMatch || altMatch;
    })
    .filter(s => !showOnlyReported || (s.reportedIssues && s.reportedIssues.length > 0))
    .filter(s => !showOnlyNew || s.isNew === true)
    .filter(s => !showOnlyIncomplete || checkHasMissingRequiredMetadata(s))
    .sort((a,b) => (a.title || "").localeCompare(b.title || ""));

    return (
      <>
      <h2 className="text-2xl font-bold text-blue-400 text-center mb-6">🛠️ Quizdaten-Editor</h2>

      {status && <p className="text-center text-sm text-yellow-300 bg-gray-700 p-2 rounded-md mb-4 h-auto break-words">{status}</p>}
      {loading && !status.includes("Lade Songs...") && status === '' && <p className="text-center text-sm text-blue-300 mb-4">Verarbeite...</p>}

      <Card className="space-y-4 mb-6" {...commonDragEvents}>
      <h3 className="text-xl font-semibold text-blue-300">Neue Songs hochladen</h3>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Optionaler Titel (Standard: Dateiname)"/>
      <Select value={category} onChange={e => setCategory(e.target.value)} options={EDITOR_CATEGORIES}/>
      <input
      type="file" multiple accept="audio/*"
      onChange={e => handleFileSelect(e.target.files)}
      className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-blue-500 file:text-black hover:file:bg-blue-400 cursor-pointer"
      key={files.map(f=>f.name).join('-')}
      />
      <div className={`w-full border-2 border-dashed rounded-xl p-4 text-center transition-colors duration-200 ${ drag ? 'border-blue-400 bg-gray-800' : 'border-gray-700 hover:border-gray-600' }`} {...commonDragEvents}>
      {files.length > 0 ? `${files.length} Datei(en) ausgewählt: ${files.map(f=>f.name).join(', ')}` : '🎵 Audiodateien hierhin ziehen oder oben auswählen'}
      </div>
      <Button className="w-full" onClick={handleUploadNewSongs} disabled={files.length === 0 || loading}>
      📤 {files.length > 1 ? `${files.length} Songs hochladen` : (files.length === 1 ? 'Ausgewählten Song hochladen' : 'Hochladen (erst Dateien wählen)')}
      </Button>
      </Card>

      <Card className="mb-6 p-4 space-y-4">
      <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 Titel oder Alternativtitel suchen …"/>
      <div className="flex flex-wrap justify-center items-center gap-2">
      {['Alle', ...EDITOR_CATEGORIES].map(cat => ( <Button key={cat} variant={filter === cat ? 'primary' : 'secondary'} onClick={() => setFilter(cat)} className="w-auto inline-flex px-3 py-1 text-xs sm:text-sm">{cat}</Button> ))}
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center mt-2 gap-2 sm:gap-4">
      <div> <input type="checkbox" id="showOnlyReportedFilter" checked={showOnlyReported} onChange={(e) => setShowOnlyReported(e.target.checked)} className="h-4 w-4 text-blue-500 border-gray-500 rounded focus:ring-blue-400 bg-gray-700 mr-2"/> <label htmlFor="showOnlyReportedFilter" className="text-sm text-gray-300 cursor-pointer">Nur gemeldete</label> </div>
      <div> <input type="checkbox" id="showOnlyNewFilter" checked={showOnlyNew} onChange={(e) => setShowOnlyNew(e.target.checked)} className="h-4 w-4 text-yellow-500 border-gray-500 rounded focus:ring-yellow-400 bg-gray-700 mr-2"/> <label htmlFor="showOnlyNewFilter" className="text-sm text-gray-300 cursor-pointer">Nur neue Einträge</label> </div>
      <div> <input type="checkbox" id="showOnlyIncompleteFilter" checked={showOnlyIncomplete} onChange={(e) => setShowOnlyIncomplete(e.target.checked)} className="h-4 w-4 text-orange-500 border-gray-500 rounded focus:ring-orange-400 bg-gray-700 mr-2"/> <label htmlFor="showOnlyIncompleteFilter" className="text-sm text-gray-300 cursor-pointer">Nur unvollständige Metadaten</label> </div>
      </div>
      <p className="text-center text-sm text-gray-400">Zeige {visibleSongs.length} von {songs.length} Songs</p>
      </Card>

      <h3 className="text-xl font-semibold text-blue-300 mb-2 mt-8">Vorhandene Songs bearbeiten</h3>
      <div className="bg-gray-900 p-1 rounded-lg border border-gray-700">
      <div className="space-y-1 p-2 h-[calc(100vh-550px)] min-h-[200px] sm:h-[calc(100vh-500px)] sm:min-h-[250px] overflow-y-auto rounded-lg" style={{ scrollbarWidth: 'thin' }}>
      {loading && songs.length === 0 && !status.includes("Fehler") ? (<p className="text-center text-gray-500 py-10">Lade Songs...</p>) :
        !loading && songs.length === 0 && !status.includes("Fehler") ? (<p className="text-center text-gray-500 py-10">Keine Songs in der Datenbank. Lade oben welche hoch!</p>) :
        visibleSongs.length > 0 ? (visibleSongs.map(song => {
          const hasMissingMeta = checkHasMissingRequiredMetadata(song);
          return (
            <div key={song._id} className="relative pr-16 md:pr-20"> {/* Padding rechts für Icons */}
            <SongEditor song={song} onUpdate={() => fetchSongs(false)} onDelete={() => handleDeleteSongEntry(song._id, song.title)}/>
            <div className="absolute top-3 sm:top-4 right-1 sm:right-2 flex flex-col items-center gap-1.5">
            {song.isNew && ( <div className="p-1 rounded-full bg-yellow-500 text-white" title="Neuer Eintrag"><SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5" /></div> )}
            {hasMissingMeta && ( <div className="p-1 rounded-full bg-orange-500 text-white" title="Erforderliche Metadaten fehlen"><InformationCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" /></div> )}
            {song.reportedIssues && song.reportedIssues.length > 0 && (
              <div className="p-1 rounded-full bg-red-600 text-white cursor-help"
              title={(() => { if (!song.reportedIssues || song.reportedIssues.length === 0) return ''; const lastReport = song.reportedIssues[song.reportedIssues.length - 1]; let tooltipText = `Gemeldete Probleme: ${song.reportedIssues.length}\nLetztes: ${lastReport?.type || 'N/A'}\nZeit: ${lastReport?.timestamp ? new Date(lastReport.timestamp).toLocaleString() : 'N/A'}`; if (lastReport?.comment && lastReport.comment.trim() !== '') { tooltipText += `\nKommentar: ${lastReport.comment}`; } return tooltipText; })()}
              ><FlagIcon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
            )}
            </div>
            </div>
          );
        })) : (
        <p className="text-center text-gray-500 py-10">
        {showOnlyReported && showOnlyNew && showOnlyIncomplete ? "Keine passenden Songs gefunden." :
          showOnlyReported && showOnlyNew ? "Keine neuen, gemeldeten Songs gefunden." :
          showOnlyReported && showOnlyIncomplete ? "Keine gemeldeten, unvollständigen Songs gefunden." :
          showOnlyNew && showOnlyIncomplete ? "Keine neuen, unvollständigen Songs gefunden." :
          showOnlyReported ? "Keine gemeldeten Songs gefunden." :
          showOnlyNew ? "Keine neuen Songs gefunden." :
          showOnlyIncomplete ? "Keine unvollständigen Songs gefunden." :
          "Keine Songs für aktuellen Filter gefunden."}
          </p>
        )}
        </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={handleExport}>📤 Alle Exportieren</Button>
        <label className="cursor-pointer">
        <span className={`inline-block px-4 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600 text-white`}>
        📥 Importieren (WIP)
        </span>
        <input type="file" accept=".json" onChange={handleImport} className="hidden" disabled={true} />
        </label>
        </div>
      </>
    );
}
