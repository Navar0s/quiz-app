// frontend/src/api.js

// Die API-Basis-URL ist jetzt immer relativ, da Nginx alles korrekt routet.
const API_BASE_URL_INTERNAL = ''; // Leer lassen, Nginx kümmert sich um /api, /audio, /socket.io

export const API_BASE_URL = API_BASE_URL_INTERNAL; // EXPORT HINZUGEFÜGT/SICHERGESTELLT

export const API = `${API_BASE_URL_INTERNAL}/api`; // Für REST-API Aufrufe

// Für Socket.IO:
// Die URL für Socket.IO ist der Ursprung der Seite.
// Der Pfad wird in der Socket.IO Client-Konfiguration gesetzt.
// SOCKET_URL wird der Ursprung der Seite sein, wenn API_BASE_URL leer ist,
// oder die volle Basis-URL, falls sie mal gesetzt werden sollte.
export const SOCKET_URL = API_BASE_URL_INTERNAL; // Ist effektiv window.location.origin, wenn API_BASE_URL_INTERNAL leer ist
