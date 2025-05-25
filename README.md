# Music Quiz App / Musik Quiz App

English version below / Deutsche Version weiter unten

---
# Music Quiz App

A web-based music quiz application designed to test your knowledge of songs from various genres and eras. Players can enjoy a solo experience, and future updates may include multiplayer modes. The application also features a quiz data editor for managing the song library and tracks high scores.

## Key Features

*   **Solo Quiz Mode:** Play alone and test your music recognition skills.
*   **Quiz Data Editor:** An interface to add, view, and manage the songs used in the quiz.
*   **Highscore Tracking:** Compete for the top spot on the leaderboard.
*   **(In Development/Planned):** Gamemaster-led and Buzzer-based multiplayer modes.

## Technology Stack

*   **Frontend:** React, Vite, Tailwind CSS, Socket.IO (client), Wavesurfer.js
*   **Backend:** Node.js, Express, Socket.IO
*   **Deployment & Serving:** Docker, Nginx

## Running the Project

### Using Docker (Recommended)

This is the easiest way to get the application running.

1.  **Prerequisites:**
    *   Ensure you have Docker and Docker Compose installed on your system.
2.  **Setup:**
    *   Clone this repository.
    *   Create a `.env` file in the `backend` directory. You can copy `backend/.env.example` if it exists, or create a new one with at least the `PORT` variable (e.g., `PORT=3001`).
3.  **Run:**
    *   Open your terminal in the project root directory and run:
        ```bash
        docker-compose up -d
        ```
4.  **Access:**
    *   Open your browser and go to: `http://localhost` (or `http://localhost:80`)

### Local Development

Follow these steps to run the frontend and backend services separately for development.

#### Backend

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    *   Create a `.env` file in the `backend` directory (e.g., copy from an example or create anew).
    *   Define necessary variables, for example:
        ```
        PORT=3001
        # Add other backend-specific environment variables if any
        ```
4.  Run the backend server:
    ```bash
    node server.js
    ```
    The backend will typically be available on `http://localhost:3001` (or the port specified in your `.env` file).

#### Frontend

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the frontend development server:
    ```bash
    npm run dev
    ```
    The frontend will typically be available on `http://localhost:5173`.

## Project Structure

```
.
├── backend/            # Node.js Express backend
│   ├── data/           # JSON files for songs, highscores
│   ├── public/
│   │   └── audio/      # MP3 audio files for the quiz
│   ├── server.js       # Main backend application file
│   ├── Dockerfile      # Dockerfile for the backend
│   └── .env            # Environment variables for backend (create this)
├── frontend/           # React frontend application
│   ├── src/            # Source files
│   ├── public/         # Static assets
│   ├── vite.config.js  # Vite configuration
│   └── Dockerfile      # (Note: The frontend is built as part of the Nginx Docker image creation process defined in nginx/Dockerfile. Nginx then serves these built static files.)
├── nginx/              # Nginx configuration
│   ├── quiz.conf       # Nginx site configuration
│   └── Dockerfile      # Dockerfile for Nginx
├── docker-compose.yml  # Docker Compose file for orchestration
└── README.md           # This file
```

## Contributing

Contributions are welcome! If you'd like to improve the app or add new features (like the planned multiplayer modes), please feel free to fork the repository and submit a pull request.

---
## Deutsch

Eine webbasierte Musik-Quiz-Anwendung, mit der Sie Ihr Wissen über Songs aus verschiedenen Genres und Epochen testen können. Spieler können ein Solo-Erlebnis genießen, und zukünftige Updates können Mehrspielermodi beinhalten. Die Anwendung verfügt außerdem über einen Quizdaten-Editor zur Verwaltung der Songbibliothek und verfolgt Highscores.

### Hauptmerkmale

*   **Solo-Quiz-Modus:** Spielen Sie alleine und testen Sie Ihre Fähigkeiten im Erkennen von Musik.
*   **Quizdaten-Editor:** Eine Oberfläche zum Hinzufügen, Anzeigen und Verwalten der im Quiz verwendeten Songs.
*   **Highscore-Verfolgung:** Kämpfen Sie um den Spitzenplatz in der Bestenliste.
*   **(In Entwicklung/Geplant):** Spielleiter-geführte und Buzzer-basierte Mehrspielermodi.

### Technologie-Stack

*   **Frontend:** React, Vite, Tailwind CSS, Socket.IO (Client), Wavesurfer.js
*   **Backend:** Node.js, Express, Socket.IO
*   **Deployment & Bereitstellung:** Docker, Nginx

### Projekt ausführen

#### Mit Docker (Empfohlen)

Dies ist der einfachste Weg, um die Anwendung zum Laufen zu bringen.

1.  **Voraussetzungen:**
    *   Stellen Sie sicher, dass Docker und Docker Compose auf Ihrem System installiert sind.
2.  **Einrichtung:**
    *   Klonen Sie dieses Repository.
    *   Erstellen Sie eine `.env`-Datei im `backend`-Verzeichnis. Sie können `backend/.env.example` kopieren, falls vorhanden, oder eine neue Datei mit mindestens der `PORT`-Variable erstellen (z.B. `PORT=3001`).
3.  **Ausführen:**
    *   Öffnen Sie Ihr Terminal im Projektstammverzeichnis und führen Sie aus:
        ```bash
        docker-compose up -d
        ```
4.  **Zugriff:**
    *   Öffnen Sie Ihren Browser und gehen Sie zu: `http://localhost` (oder `http://localhost:80`)

#### Lokale Entwicklung

Befolgen Sie diese Schritte, um die Frontend- und Backend-Dienste separat für die Entwicklung auszuführen.

##### Backend

1.  Navigieren Sie zum `backend`-Verzeichnis:
    ```bash
    cd backend
    ```
2.  Abhängigkeiten installieren:
    ```bash
    npm install
    ```
3.  Umgebungsvariablen einrichten:
    *   Erstellen Sie eine `.env`-Datei im `backend`-Verzeichnis (z.B. aus einem Beispiel kopieren oder neu erstellen).
    *   Definieren Sie notwendige Variablen, zum Beispiel:
        ```
        PORT=3001
        # Fügen Sie bei Bedarf weitere backend-spezifische Umgebungsvariablen hinzu
        ```
4.  Backend-Server starten:
    ```bash
    node server.js
    ```
    Das Backend ist normalerweise unter `http://localhost:3001` (oder dem in Ihrer `.env`-Datei angegebenen Port) verfügbar.

##### Frontend

1.  Navigieren Sie zum `frontend`-Verzeichnis:
    ```bash
    cd frontend
    ```
2.  Abhängigkeiten installieren:
    ```bash
    npm install
    ```
3.  Frontend-Entwicklungsserver starten:
    ```bash
    npm run dev
    ```
    Das Frontend ist normalerweise unter `http://localhost:5173` verfügbar.

### Projektstruktur

```
.
├── backend/            # Node.js Express Backend
│   ├── data/           # JSON-Dateien für Songs, Highscores
│   ├── public/
│   │   └── audio/      # MP3-Audiodateien für das Quiz
│   ├── server.js       # Haupt-Backend-Anwendungsdatei
│   ├── Dockerfile      # Dockerfile für das Backend
│   └── .env            # Umgebungsvariablen für das Backend (diese erstellen)
├── frontend/           # React Frontend-Anwendung
│   ├── src/            # Quelldateien
│   ├── public/         # Statische Assets
│   ├── vite.config.js  # Vite-Konfiguration
│   └── Dockerfile      # (Hinweis: Das Frontend wird als Teil des Nginx-Docker-Image-Erstellungsprozesses erstellt, der in nginx/Dockerfile definiert ist. Nginx stellt dann diese erstellten statischen Dateien bereit.)
├── nginx/              # Nginx-Konfiguration
│   ├── quiz.conf       # Nginx-Site-Konfiguration
│   └── Dockerfile      # Dockerfile für Nginx
├── docker-compose.yml  # Docker Compose-Datei für die Orchestrierung
└── README.md           # Diese Datei
```

### Mitwirken

Beiträge sind willkommen! Wenn Sie die App verbessern oder neue Funktionen hinzufügen möchten (wie die geplanten Mehrspielermodi), können Sie das Repository gerne forken und einen Pull Request einreichen.
---
