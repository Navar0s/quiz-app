// src/components/EditorGuard.jsx
import { useState, useEffect } from 'react';
import Card from './Card';
import Input from './Input';
import Button from './Button';
import { API } from '../api';

export default function EditorGuard({ children }) {
    console.log("[EditorGuard] Original-Komponente gerendert.");
    const [accessGranted, setAccessGranted] = useState(false);
    const [password, setPassword]           = useState('');
    const [error, setError]                 = useState('');
    const [isLoadingToken, setIsLoadingToken] = useState(true); // Neuer State für Ladezustand des Tokens

    useEffect(() => {
        console.log("[EditorGuard] useEffect läuft zum Prüfen des Tokens.");
        try {
            const token = localStorage.getItem('editor_token');
            console.log("[EditorGuard] Token aus localStorage gelesen:", token);
            if (token === 'admin-access') {
                console.log("[EditorGuard] Gültiger Token gefunden. Setze accessGranted auf true.");
                setAccessGranted(true);
            } else {
                console.log("[EditorGuard] Kein gültiger Token oder ungültiger Token gefunden.");
                setAccessGranted(false); // Explizit false setzen
            }
        } catch (e) {
            console.error("[EditorGuard] Fehler beim Zugriff auf localStorage in useEffect:", e);
            setAccessGranted(false); // Bei Fehler Zugriff verweigern
        }
        setIsLoadingToken(false); // Ladevorgang des Tokens abgeschlossen
    }, []);

    const handleLogin = async () => {
        console.log("[EditorGuard] handleLogin aufgerufen.");
        setError('');
        try {
            const res = await fetch(`${API}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (res.ok) {
                console.log("[EditorGuard] Login erfolgreich. Versuche Token zu setzen.");
                try {
                    localStorage.setItem('editor_token', 'admin-access');
                    console.log("[EditorGuard] Token 'admin-access' in localStorage gesetzt.");
                    setAccessGranted(true);
                } catch (e) {
                    console.error("[EditorGuard] Fehler beim Setzen des Tokens in localStorage:", e);
                    setError('Fehler beim Speichern der Sitzung. Ist localStorage blockiert?');
                }
            } else {
                console.log("[EditorGuard] Login fehlgeschlagen (falsches Passwort).");
                setError('❌ Falsches Passwort');
                setPassword('');
            }
        } catch (err) {
            console.error("[EditorGuard] Netzwerk-Fehler beim Login:", err);
            setError('❌ Netzwerk-Fehler');
        }
    };

    const handleLogout = () => {
        console.log("[EditorGuard] handleLogout aufgerufen.");
        try {
            localStorage.removeItem('editor_token');
            console.log("[EditorGuard] Token aus localStorage entfernt.");
        } catch (e) {
            console.error("[EditorGuard] Fehler beim Entfernen des Tokens aus localStorage:", e);
        }
        setAccessGranted(false); // Wichtig, um den Zustand zurückzusetzen
        // window.location.reload(); // Reload kann manchmal helfen, ist aber nicht immer ideal
    };

    // Während der Token initial geladen wird, nichts oder einen Ladeindikator anzeigen
    if (isLoadingToken) {
        console.log("[EditorGuard] isLoadingToken ist true, zeige Ladezustand (oder nichts).");
        return <div style={{color: "white", textAlign: "center", paddingTop: "50px"}}>Prüfe Authentifizierung...</div>; // Oder null, wenn nichts angezeigt werden soll
    }

    if (!accessGranted) {
        console.log("[EditorGuard] Zugriff NICHT gewährt (accessGranted=false), zeige Login-Formular.");
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <Card className="space-y-4 w-full max-w-sm">
            <h2 className="text-xl font-bold text-center text-blue-300">🔒 Editor-Zugriff</h2>
            <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => {if (e.key === 'Enter') handleLogin();}}
            placeholder="Passwort"
            autoFocus
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <Button onClick={handleLogin}>🔓 Login</Button>
            </Card>
            </div>
        );
    }

    console.log("[EditorGuard] Zugriff GEWÄHRT (accessGranted=true), rendere children.");
    return (
        <>
        <div className="absolute top-4 right-4 z-[1000]"> {/* Höherer z-index */}
        <Button variant="destructive" size="sm" onClick={handleLogout}>🚪 Logout</Button>
        </div>
        {children}
        </>
    );
}
