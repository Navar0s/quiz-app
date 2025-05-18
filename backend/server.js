// backend/server.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto'; // Import für crypto.randomUUID()
import dotenv from 'dotenv';

dotenv.config();

const CATEGORIES = ['Filme', 'Serien', 'Games']; // Synchron mit Frontend halten
const HIGHSCORE_QUESTION_COUNTS = [10, 25, 50]; // Synchron mit Frontend halten

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'quizmaster23';

const SONGS_FILE = path.join(__dirname, 'data', 'songs.json');
const HIGHSCORE_FILE = path.join(__dirname, 'data', 'highscores.json'); // Ist schon da

// Verzeichnisse sicherstellen
const dataDir = path.join(__dirname, 'data');
const logsDir = path.join(__dirname, 'logs');
const audioDir = path.join(__dirname, 'public', 'audio');
const tempUploadDir = path.join(__dirname, 'data', 'temp_uploads');

for (const dir of [dataDir, logsDir, audioDir, tempUploadDir]) {
  if (!fs.existsSync(dir)) {
    console.log(`Erstelle Verzeichnis: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Hilfsfunktion zum Bereinigen und Dekodieren von Dateinamen
const sanitizeAndDecodeFilename = (originalFilename) => {
  let decoded = originalFilename;
  try {
    decoded = decodeURIComponent(originalFilename);
  } catch (e) {
    console.warn(`Konnte Dateinamen nicht vollständig dekodieren: ${originalFilename}`, e);
  }
  const sane = decoded.replace(/[\s]+/g, '_').replace(/[^\w.\-]+/g, '');
  return sane.replace(/^\.+$/, 'file').replace(/^$/, 'file') || 'file';
};


// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Globale Logging-Middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`--- EINGEHENDE ANFRAGE ---`);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} von IP ${req.ip}`);
  if (req.method !== 'POST' || !req.headers['content-type']?.includes('multipart/form-data')) {
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyToLog = JSON.stringify(req.body, null, 2);
      console.log('Body:', bodyToLog.length > 1000 ? bodyToLog.substring(0, 1000) + '... (gekürzt)' : bodyToLog);
    }
  }
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ANTWORT für ${req.method} ${req.originalUrl}: Status ${res.statusCode} (${duration}ms)`);
    console.log(`--- ANFRAGE BEENDET ---`);
  });
  next();
});

app.use(express.static(path.join(__dirname, 'public')));
console.log(`Statische Dateien werden aus ${path.join(__dirname, 'public')} bereitgestellt.`);

const loadJson = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      // Erste Zeile parsen, um leere Datei abzufangen bevor JSON.parse einen Fehler wirft
      if (fileData.trim() === '') {
        if (filePath === HIGHSCORE_FILE) {
          console.log(`Highscore-Datei ${filePath} ist leer, initialisiere mit leerer Struktur.`);
          return { timetrial_hs: [], survival: [] };
        }
        return []; // Für andere leere JSONs
      }
      const jsonData = JSON.parse(fileData);

      if (filePath === SONGS_FILE && Array.isArray(jsonData)) {
        return jsonData.map(song => ({
          ...song,
          reportedIssues: song.reportedIssues || [],
          isNew: song.isNew === undefined ? false : song.isNew
        }));
      }
      // Für Highscores ein Objekt mit leeren Arrays als Fallback sicherstellen
      if (filePath === HIGHSCORE_FILE) {
        return {
          timetrial_hs: Array.isArray(jsonData.timetrial_hs) ? jsonData.timetrial_hs : [],
          survival: Array.isArray(jsonData.survival) ? jsonData.survival : [],
        };
      }
      return jsonData;
    }
    // Wenn die Datei nicht existiert
    if (filePath === HIGHSCORE_FILE) {
      console.log(`Highscore-Datei ${filePath} nicht gefunden, initialisiere mit leerer Struktur.`);
      return { timetrial_hs: [], survival: [] };
    }
    return [];
  } catch (err) {
    console.error(`Fehler beim Laden von JSON aus ${filePath}:`, err);
    if (filePath === HIGHSCORE_FILE) {
      return { timetrial_hs: [], survival: [] }; // Fallback bei Parse-Fehler
    }
    return [];
  }
};

const saveJson = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`JSON erfolgreich in ${filePath} gespeichert.`);
  } catch (err) {
    console.error(`Fehler beim Speichern von JSON in ${filePath}:`, err);
  }
};

const api = express.Router();
api.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
api.head('/health', (_req, res) => res.sendStatus(200));

api.get('/songs', (_req, res) => {
  console.log('GET /api/songs - Bearbeitung beginnt');
  const songs = loadJson(SONGS_FILE); // loadJson stellt nun sicher, dass reportedIssues existiert
  console.log(`GET /api/songs - ${songs.length} Songs geladen. Sende Antwort.`);
  res.json(songs);
});

const MAX_HIGHSCORES_GLOBAL_PER_MODE = 100; // Globale Obergrenze pro Modus, um die Datei nicht explodieren zu lassen

function addAndManageHighscores(allHighscores, mode, newEntry) {
  if (!allHighscores[mode] || !Array.isArray(allHighscores[mode])) {
    console.warn(`Modus ${mode} in Highscores nicht als Array initialisiert. Wird jetzt erstellt.`);
    allHighscores[mode] = [];
  }

  // Eindeutige ID für den neuen Eintrag, falls nicht schon vom Client gesetzt (Backend sollte immer eine setzen)
  if (!newEntry.id) {
    newEntry.id = crypto.randomUUID();
  }
  // Sicherstellen, dass der Timestamp vorhanden ist
  if (!newEntry.timestamp) {
    newEntry.timestamp = new Date().toISOString();
  }


  allHighscores[mode].push(newEntry);
  console.log(`Neuer Eintrag für Modus ${mode} hinzugefügt. Aktuelle Anzahl: ${allHighscores[mode].length}`);


  // Sortiere die Highscores für den spezifischen Modus
  if (mode === 'timetrial_hs') {
    allHighscores[mode].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // Score DESC
      return a.totalTimeMs - b.totalTimeMs;              // Time ASC
    });
    console.log(`Highscores für ${mode} sortiert nach Score (DESC), dann Zeit (ASC).`);
  } else if (mode === 'survival') {
    allHighscores[mode].sort((a, b) => {
      if (b.songsCleared !== a.songsCleared) return b.songsCleared - a.songsCleared; // Songs DESC
      return b.score - a.score;                                                      // Score DESC
    });
    console.log(`Highscores für ${mode} sortiert nach SongsCleared (DESC), dann Score (DESC).`);
  }

  // Globale Begrenzung der Liste pro Modus (einfache Variante)
  if (allHighscores[mode].length > MAX_HIGHSCORES_GLOBAL_PER_MODE) {
    console.log(`Highscore-Liste für Modus ${mode} von ${allHighscores[mode].length} auf die besten ${MAX_HIGHSCORES_GLOBAL_PER_MODE} gekürzt.`);
    allHighscores[mode] = allHighscores[mode].slice(0, MAX_HIGHSCORES_GLOBAL_PER_MODE);
  }
  // Für eine präzisere Kürzung (z.B. Top X pro Kategorie/Fragenanzahl) wäre hier deutlich mehr Logik nötig.
  // Das würde bedeuten:
  // 1. Gruppieren der Einträge nach `category` und (für timetrial_hs) `questionCount`.
  // 2. Innerhalb jeder Gruppe die Top N behalten.
  // 3. Alle Gruppen wieder zusammenführen.
  // Das heben wir uns für später auf, falls nötig.

  return allHighscores;
}
// --- HIGHSCORE ENDPUNKTE ---

// GET /api/highscores (ersetzt/aktualisiert den alten /api/highscore GET)
api.get('/highscores', (_req, res) => {
  console.log('GET /api/highscores');
  const highscores = loadJson(HIGHSCORE_FILE); // Nutzt die angepasste loadJson Funktion
  res.json(highscores);
});

// POST /api/highscores/:mode
api.post('/highscores/:mode', (req, res) => {
  const mode = req.params.mode;
  const newEntryData = req.body; // Das ist das Objekt vom Frontend

  console.log(`POST /api/highscores/${mode} mit Body:`, JSON.stringify(newEntryData, null, 2).substring(0, 500) + '...'); // Gekürztes Log

  if (mode !== 'timetrial_hs' && mode !== 'survival') {
    return res.status(400).json({ error: 'Ungültiger Modus. Erlaubt: timetrial_hs, survival.' });
  }

  // Validierung: Grundlegende Felder
  if (!newEntryData.playerName || typeof newEntryData.playerName !== 'string' || newEntryData.playerName.trim() === '') {
    return res.status(400).json({ error: 'Spielername ist erforderlich.' });
  }
  if (newEntryData.playerName.length > 15) { // Entspricht Frontend-maxLength
    return res.status(400).json({ error: 'Spielername darf maximal 15 Zeichen lang sein.'});
  }
  if (typeof newEntryData.score !== 'number') { // score ist für beide Modi wichtig
    return res.status(400).json({ error: 'Score ist erforderlich und muss eine Zahl sein.' });
  }
  if (!newEntryData.category || typeof newEntryData.category !== 'string') {
    return res.status(400).json({ error: 'Kategorie ist erforderlich.'});
  }
  // Gültige Kategorien prüfen (optional, aber gut für Datenintegrität)
  const validCategories = [...CATEGORIES, "mixed"]; // Annahme: CATEGORIES ist ['Filme', 'Serien', 'Games']
  if (!validCategories.includes(newEntryData.category)) {
    return res.status(400).json({ error: `Ungültige Kategorie: ${newEntryData.category}. Erlaubt: ${validCategories.join(', ')}`});
  }


  // Modus-spezifische Validierungen
  if (mode === 'timetrial_hs') {
    if (typeof newEntryData.totalTimeMs !== 'number' || typeof newEntryData.questionCount !== 'number') {
      return res.status(400).json({ error: 'Für TimeTrial HS sind totalTimeMs und questionCount Zahlenwerte erforderlich.' });
    }
    const validCounts = HIGHSCORE_QUESTION_COUNTS; // [10, 25, 50] aus quizConfig.js
    if (!validCounts.includes(newEntryData.questionCount)) {
      return res.status(400).json({ error: `Ungültige questionCount für TimeTrial HS. Erlaubt: ${validCounts.join(', ')}`});
    }
    if (typeof newEntryData.correctlyGuessed !== 'number') {
      return res.status(400).json({ error: 'correctlyGuessed ist für TimeTrial HS erforderlich.'});
    }
  } else if (mode === 'survival') {
    if (typeof newEntryData.songsCleared !== 'number') {
      return res.status(400).json({ error: 'Für Survival ist songsCleared als Zahlenwert erforderlich.' });
    }
  }

  // Serverseitige ID und Timestamp setzen/überschreiben (Sicherheitsmaßnahme)
  newEntryData.id = crypto.randomUUID();
  newEntryData.timestamp = new Date().toISOString();

  try {
    let allHighscores = loadJson(HIGHSCORE_FILE);
    allHighscores = addAndManageHighscores(allHighscores, mode, newEntryData);
    saveJson(HIGHSCORE_FILE, allHighscores);

    console.log(`Highscore für ${mode} erfolgreich gespeichert. ID: ${newEntryData.id}`);
    res.status(201).json({ message: 'Highscore erfolgreich gespeichert!', entryId: newEntryData.id });
  } catch (error) {
    console.error(`Fehler beim Speichern des Highscores für Modus ${mode}:`, error);
    res.status(500).json({ error: 'Interner Serverfehler beim Speichern des Highscores.' });
  }
});

// Multer Konfigurationen (initialUploadStorage, audioReplaceStorage, initialUpload, uploadAudioReplace)
const initialUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempUploadDir),
                                                filename: (req, file, cb) => {
                                                  const sanitizedOriginalName = sanitizeAndDecodeFilename(file.originalname);
                                                  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                                                  const tempFilename = `${path.parse(sanitizedOriginalName).name}-${uniqueSuffix}${path.parse(sanitizedOriginalName).ext}`;
                                                  cb(null, tempFilename);
                                                }
});
const initialUpload = multer({ storage: initialUploadStorage, limits: { fileSize: 50 * 1024 * 1024 } });

const audioReplaceStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempUploadDir),
                                               filename: (req, file, cb) => {
                                                 const sanitizedOriginalName = sanitizeAndDecodeFilename(file.originalname);
                                                 const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                                                 const tempFilename = `${path.parse(sanitizedOriginalName).name}-${uniqueSuffix}${path.parse(sanitizedOriginalName).ext}`;
                                                 cb(null, tempFilename);
                                               }
});
const uploadAudioReplace = multer({ storage: audioReplaceStorage, limits: { fileSize: 50 * 1024 * 1024 } });

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    console.error('[Multer Fehlerbehandlung] Multer Fehler:', err);
    if (!res.headersSent) return res.status(400).json({ error: `Upload Fehler (Multer): ${err.message}`, code: err.code });
  } else if (err) {
    console.error('[Multer Fehlerbehandlung] Anderer Fehler:', err);
    if (!res.headersSent) return res.status(500).json({ error: 'Ein unerwarteter Fehler ist beim Upload aufgetreten.' });
  }
  next();
}

// POST /api/upload (für komplett neue Songs)
api.post('/upload', initialUpload.single('file'), handleMulterError, async (req, res) => {
  console.log('--- BEGINN Bearbeitung /api/upload Route ---');
  if (!req.file) return res.status(400).json({ error: 'Keine Datei im Upload gefunden.' });

  const tempPath = req.file.path;
  const finalFilename = sanitizeAndDecodeFilename(req.file.originalname);
  const targetPath = path.join(audioDir, finalFilename);

  try {
    if (fs.existsSync(targetPath)) {
      console.warn(`Upload abgebrochen: Datei ${finalFilename} existiert bereits.`);
      await fsp.unlink(tempPath);
      return res.status(409).json({ error: `Datei ${finalFilename} existiert bereits.` });
    }

    await fsp.copyFile(tempPath, targetPath);
    await fsp.unlink(tempPath);

    const songs = loadJson(SONGS_FILE); // lädt bereits mit Defaults für reportedIssues und isNew
    const newSongData = {
      _id: crypto.randomUUID(),
         title: req.body.title || path.parse(finalFilename).name,
         category: req.body.category || 'Sonstiges',
         audio: `/audio/${finalFilename}`,
         filename: finalFilename,
         startTime: parseInt(req.body.startTime, 10) || 0,
         alternativeTitles: req.body.alternativeTitles ? JSON.parse(req.body.alternativeTitles) : [],
         metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
         reportedIssues: [],
         isNew: true, // NEU: Neuer Song wird als 'isNew: true' markiert
    };
    songs.push(newSongData);
    saveJson(SONGS_FILE, songs);
    console.log(`Neuer Song erstellt mit isNew: true - ID: ${newSongData._id}`);
    res.status(201).json({ message: 'Upload erfolgreich', song: newSongData });
  } catch (error) {
    console.error('Fehler im /api/upload Prozess:', error);
    if (fs.existsSync(tempPath)) await fsp.unlink(tempPath).catch(e => console.error("Aufräumfehler:", e));
    res.status(500).json({ error: 'Fehler beim Upload.', details: error.message });
  }
});

// PUT /api/songs/:id (Metadaten aktualisieren)
api.put('/songs/:id', (req, res) => {
  const songId = req.params.id;
  console.log(`PUT /api/songs/${songId} Body:`, JSON.stringify(req.body, null, 2));
  const songs = loadJson(SONGS_FILE);
  const songIndex = songs.findIndex(s => s._id === songId);

  if (songIndex === -1) return res.status(404).json({ error: 'Song nicht gefunden' });

  // Behalte alle Felder des alten Songs bei und überschreibe nur die übergebenen
  const updatedSong = {
    ...songs[songIndex], // Behält existierende Felder wie audio, filename, reportedIssues, isNew
    ...req.body,         // Überschreibt Felder aus dem Request-Body
    // Stelle sicher, dass metadata korrekt gemerged wird, falls es partiell gesendet wird
    metadata: {
      ...(songs[songIndex].metadata || {}), // Alte Metadaten
        ...(req.body.metadata || {})         // Neue Metadaten (überschreiben alte bei gleichen Keys)
    },
    // Stelle sicher, dass alternativeTitles ein Array ist
    alternativeTitles: Array.isArray(req.body.alternativeTitles)
    ? req.body.alternativeTitles
    : (songs[songIndex].alternativeTitles || [])
  };

  // Logik für das Zurücksetzen von Flags beim Speichern
  updatedSong.reportedIssues = [];
  updatedSong.isNew = false; // NEU: 'isNew' Flag wird beim Speichern auf false gesetzt

  console.log(`[PUT /api/songs/${songId}] Flags aktualisiert: reportedIssues geleert, isNew auf false.`);

  songs[songIndex] = updatedSong;
  saveJson(SONGS_FILE, songs);
  res.json({ message: 'Song aktualisiert, Meldungen & "Neu"-Status zurückgesetzt', song: updatedSong });
});

// NEUE ROUTE: POST /api/songs/:id/report
api.post('/songs/:id/report', (req, res) => {
  const songId = req.params.id;
  const { problemType, comment } = req.body;

  console.log(`POST /api/songs/${songId}/report - Typ: ${problemType}, Kommentar: ${comment}`);

  if (!problemType) return res.status(400).json({ error: 'problemType ist erforderlich.' });

  const allowedProblemTypes = ["playback_error", "wrong_info", "audio_quality", "length_issue", "other"];
  if (!allowedProblemTypes.includes(problemType)) {
    return res.status(400).json({ error: `Ungültiger problemType. Erlaubt: ${allowedProblemTypes.join(', ')}` });
  }

  const songs = loadJson(SONGS_FILE);
  const songIndex = songs.findIndex(s => s._id === songId);

  if (songIndex === -1) return res.status(404).json({ error: 'Song nicht gefunden' });

  const songToUpdate = songs[songIndex];
  // reportedIssues sollte durch loadJson bereits als Array initialisiert sein
  // if (!Array.isArray(songToUpdate.reportedIssues)) songToUpdate.reportedIssues = []; // Doppelte Sicherheit

  const newReport = { type: problemType, timestamp: new Date().toISOString() };
  if (comment) newReport.comment = comment;

  songToUpdate.reportedIssues.push(newReport);

  songs[songIndex] = songToUpdate;
  saveJson(SONGS_FILE, songs);

  console.log(`Problem für Song ${songId} gemeldet: ${JSON.stringify(newReport)}`);
  res.status(200).json({ message: 'Problem erfolgreich gemeldet.', song: songToUpdate });
});

// POST /api/songs/:id/replace-audio (Audiodatei ersetzen)
api.post('/songs/:id/replace-audio', uploadAudioReplace.single('newAudioFile'), handleMulterError, async (req, res) => {
  const songId = req.params.id;
  console.log(`--- BEGINN /api/songs/${songId}/replace-audio ---`);
  // ... (logging von req.file, req.body) ...

  if (!req.file) return res.status(400).json({ error: 'Keine neue Audiodatei gefunden.' });

  let songs = loadJson(SONGS_FILE); // Sicherstellen, dass reportedIssues geladen wird
  const songIndex = songs.findIndex(s => s._id === songId);

  if (songIndex === -1) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      await fsp.unlink(req.file.path).catch(e => console.error("Aufräumfehler temp:", e.message));
    }
    return res.status(404).json({ error: 'Song nicht gefunden' });
  }

  const songToUpdate = songs[songIndex]; // Beinhaltet existierende reportedIssues
  const oldFilename = songToUpdate.filename;
  const tempNewAudioPath = req.file.path;
  const newFinalFilename = sanitizeAndDecodeFilename(req.file.originalname);
  const newFinalTargetPath = path.join(audioDir, newFinalFilename);

  // ... (logging der Pfade und Namen) ...

  try {
    // 1. Alte Audiodatei löschen
    if (oldFilename && oldFilename !== newFinalFilename) {
      const oldAudioFilePath = path.join(audioDir, oldFilename);
      if (fs.existsSync(oldAudioFilePath)) {
        await fsp.unlink(oldAudioFilePath);
        console.log(`[Replace Audio] Alte Datei ${oldAudioFilePath} gelöscht.`);
      } else {
        console.warn(`[Replace Audio] Alte Datei ${oldAudioFilePath} nicht gefunden.`);
      }
    }
    // ... (andere Bedingungen für oldFilename)

    // 2. Konfliktprüfung für Zieldatei
    if ((!oldFilename || oldFilename !== newFinalFilename) && fs.existsSync(newFinalTargetPath)) {
      console.warn(`[Replace Audio] Konflikt: ${newFinalTargetPath} existiert bereits.`);
      await fsp.unlink(tempNewAudioPath);
      return res.status(409).json({ error: `Datei ${newFinalFilename} existiert bereits.` });
    }

    // 3. Neue Datei kopieren und temporäre löschen
    await fsp.copyFile(tempNewAudioPath, newFinalTargetPath);
    await fsp.unlink(tempNewAudioPath);
    console.log(`[Replace Audio] Datei ${tempNewAudioPath} nach ${newFinalTargetPath} kopiert und Original gelöscht.`);

    // 4. Song-Eintrag aktualisieren (reportedIssues bleiben erhalten)
    songToUpdate.audio = `/audio/${newFinalFilename}`;
    songToUpdate.filename = newFinalFilename;

    songs[songIndex] = songToUpdate;
    saveJson(SONGS_FILE, songs);
    res.json({ message: 'Audiodatei ersetzt', song: songToUpdate });

  } catch (error) {
    console.error(`[Replace Audio] FEHLER für Song ${songId}:`, error.message, error.stack);
    if (fs.existsSync(tempNewAudioPath)) {
      await fsp.unlink(tempNewAudioPath).catch(e => console.error("Aufräumfehler temp nach Fehler:", e.message));
    }
    res.status(500).json({ error: 'Fehler beim Ersetzen der Audiodatei.', details: error.message });
  }
});

// DELETE /api/songs/:id/audio (Nur Audiodatei löschen)
api.delete('/songs/:id/audio', async (req, res) => {
  const songId = req.params.id;
  // ... (Logik bleibt gleich, reportedIssues werden nicht berührt) ...
  const songs = loadJson(SONGS_FILE);
  const songIndex = songs.findIndex(s => s._id === songId);

  if (songIndex === -1) return res.status(404).json({ error: 'Song nicht gefunden' });

  const songToUpdate = songs[songIndex];
  const filenameToDelete = songToUpdate.filename;

  if (!filenameToDelete) return res.status(200).json({ message: 'Keine Audiodatei zum Löschen.', song: songToUpdate });

  const audioFilePath = path.join(audioDir, filenameToDelete);
  try {
    if (fs.existsSync(audioFilePath)) await fsp.unlink(audioFilePath);
    else console.warn(`Datei ${audioFilePath} nicht gefunden zum Löschen.`);

    songToUpdate.audio = null;
    songToUpdate.filename = null;
    songs[songIndex] = songToUpdate; // reportedIssues bleiben erhalten
    saveJson(SONGS_FILE, songs);
    res.json({ message: 'Audiodatei gelöscht', song: songToUpdate });
  } catch (error) {
    console.error(`Fehler Löschen Audio für ${songId}:`, error);
    res.status(500).json({ error: 'Fehler beim Löschen der Audiodatei.', details: error.message });
  }
});

// DELETE /api/songs/:id (Ganzen Song löschen)
api.delete('/songs/:id', async (req, res) => {
  // ... (Logik bleibt wie zuvor, löscht auch Audio-Datei) ...
  const songId = req.params.id;
  console.log(`DELETE /api/songs/${songId}`);
  let songs = loadJson(SONGS_FILE);
  const songToDelete = songs.find(s => s._id === songId);
  if (!songToDelete) return res.status(404).json({ error: 'Song nicht gefunden' });

  if (songToDelete.filename) {
    const audioFilePath = path.join(audioDir, songToDelete.filename);
    if (fs.existsSync(audioFilePath)) {
      try { await fsp.unlink(audioFilePath); console.log(`Datei ${audioFilePath} gelöscht.`);}
      catch (e) { console.error(`Fehler Löschen Datei ${audioFilePath}:`, e);}
    } else { console.warn(`Datei nicht gefunden für Löschung: ${audioFilePath}`); }
  }
  songs = songs.filter(s => s._id !== songId);
  saveJson(SONGS_FILE, songs);
  res.json({ message: 'Song gelöscht' });
});

// Highscore Endpunkte
api.get('/highscore', (_req, res) => {
  console.log('GET /api/highscore');
  const highscores = loadJson(HIGHSCORE_FILE);
  res.json(highscores);
});
//api.post('/highscore', (req, res) => {
//  console.log('POST /api/highscore mit Body:', JSON.stringify(req.body, null, 2));
//  const highscores = loadJson(HIGHSCORE_FILE); // Laden, falls Logik komplexer wird
//  saveJson(HIGHSCORE_FILE, req.body); // Momentan überschreibt es einfach
//  res.status(201).json({ message: 'Highscore gespeichert'});
//});

// Auth Endpunkt
api.post('/auth', (req, res) => {
  console.log('POST /api/auth');
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: "Authentifizierung erfolgreich." });
  } else {
    res.status(401).json({ success: false, message: "Authentifizierung fehlgeschlagen." });
  }
});

app.use('/api', api);

// Globale Express Fehlerbehandlungs-Middleware
app.use((err, req, res, next) => {
  console.error('--- UNBEHANDELTER FEHLER IN EXPRESS MIDDLEWARE ---');
  console.error('Fehlerobjekt:', err);
  if (err instanceof multer.MulterError) {
    if (!res.headersSent) return res.status(400).json({ error: `Upload Fehler (global): ${err.message}`, code: err.code });
  } else {
    if (!res.headersSent) return res.status(500).json({ error: 'Interner Serverfehler.', details: err.message });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  path: "/socket.io/"
});

io.on('connection', (socket) => {
  console.log('Socket.IO Benutzer verbunden:', socket.id);
  // ... Deine bestehende Socket.IO Logik ...
  socket.on('disconnect', () => {
    console.log('Socket.IO Benutzer getrennt:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Backend läuft im Container auf Port ${PORT}`);
  console.log(`Admin Passwort: ${ADMIN_PASSWORD === 'quizadmin_default_pls_change' ? 'NICHT SICHER (Standard)' : 'Gesetzt'}`);
  console.log(`Song JSON: ${SONGS_FILE}`);
  console.log(`Audio Verzeichnis (public): ${audioDir}`);
  console.log(`Temp Upload Verzeichnis (data): ${tempUploadDir}`);
});
