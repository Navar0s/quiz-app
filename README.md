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
