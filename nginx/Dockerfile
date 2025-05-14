# nginx/Dockerfile

# Stage 1: Baue das Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY ./frontend/package*.json ./
RUN npm install
COPY ./frontend /app
RUN npm run build

# Stage 2: Nginx-Setup
FROM nginx:1.25

# Standard-Konfig deaktivieren (optional, aber sicher)
RUN mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled || true

# Erstelle das conf.d Verzeichnis, falls es nicht existiert
RUN mkdir -p /etc/nginx/conf.d

# Kopiere unsere spezifische Server-Konfiguration in conf.d
COPY ./nginx/quiz.conf /etc/nginx/conf.d/quiz.conf

# Kopiere die gebauten Frontend-Dateien
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Setze korrekte Berechtigungen
RUN chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
