// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

                            build: {
                              // outDir: path.resolve(__dirname, '../backend/public'), // ALTE ZEILE
                              // Standard-Ausgabeverzeichnis für den Build, wenn du npm run build ausführst
                              outDir: 'dist',
                              emptyOutDir: true,
                            },

                            server: { // Für `npm run dev`
                              host: true,
                            port: 5173,
                            proxy: {
                              '/api': {
                                target: 'http://localhost:8080', // NEU: Zeigt auf den Port deines nginx_dev
                            changeOrigin: true,
                            // ws: true, // Optional, aber API-Anfragen sind meistens HTTP, nicht Websockets
                              },
                            '/audio': {
                              target: 'http://localhost:8080', // NEU: Zeigt auf den Port deines nginx_dev
                            changeOrigin: true,
                            },
                            '/socket.io': {
                              target: 'ws://localhost:8080', // NEU: Zeigt auf den Port deines nginx_dev (WICHTIG: ws:// für Websockets)
changeOrigin: true,
ws: true, // Bleibt true für Websockets
                            },
                            },
                            },

                            preview: { // Für `npm run preview` (nach einem Build)
                              host: true,
                            port: 5173,
                            proxy: {
                              '/api': {
                                target: 'http://localhost:8080', // NEU: Zeigt auf den Port deines nginx_dev
                            changeOrigin: true,
                            // ws: true,
                              },
                            '/audio': {
                              target: 'http://localhost:8080', // NEU: Zeigt auf den Port deines nginx_dev
                              changeOrigin: true,
                            },
                            '/socket.io': {
                              target: 'ws://localhost:8080', // NEU: Zeigt auf den Port deines nginx_dev (WICHTIG: ws:// für Websockets)
changeOrigin: true,
ws: true,
                            },
                            },
                            },
})
