// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// import path from 'path' // 'path' wird für outDir nicht mehr benötigt, wenn es Standard ist

export default defineConfig({
  plugins: [react()],

                            build: {
                              // outDir: path.resolve(__dirname, '../backend/public'), // ALTE ZEILE
                              outDir: 'dist', // NEU: Standard-Ausgabeverzeichnis ist 'dist' relativ zum Frontend-Root
                              emptyOutDir: true,
                            },

                            server: { // Deine server.proxy Konfiguration ist für lokale Entwicklung ohne Docker Nginx
                              host: true,
                            port: 5173,
                            proxy: {
                              '/api': {
                                target: 'http://localhost:3001',
                            changeOrigin: true,
                            ws: true,
                              },
                            '/audio': {
                              target: 'http://localhost:3001',
                            changeOrigin: true,
                            },
                            '/socket.io': {
                              target: 'http://localhost:3001',
                            changeOrigin: true,
                            ws: true,
                            },
                            },
                            },

                            preview: { // Deine preview.proxy Konfiguration ist ebenfalls für lokale Entwicklung
                              host: true,
                            port: 5173,
                            proxy: {
                              '/api': {
                                target: 'http://localhost:3001',
                            changeOrigin: true,
                            ws: true,
                              },
                            '/audio': {
                              target: 'http://localhost:3001',
                            changeOrigin: true,
                            },
                            '/socket.io': {
                              target: 'http://localhost:3001',
                            changeOrigin: true,
                            ws: true,
                            },
                            },
                            },
})
