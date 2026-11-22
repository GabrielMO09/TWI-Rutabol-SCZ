# Demostración: persistencia en PostgreSQL y sesión por cookie

## Levantar la BD (Docker Compose, puerto 5433)
```
docker compose up -d
# backend/.env: DB_HOST=127.0.0.1  DB_PORT=5433  DB_APP_PASSWORD=app_dev_pass
```

## A. Los datos sobreviven al reinicio de PostgreSQL (volumen `pgdata`)
1. Iniciar sesión (cookie `rutabol_sid`, HttpOnly) y crear un dato (p. ej. un reclamo o una parada).
2. `docker compose restart postgres` -> reiniciar el backend -> el dato sigue ahí.
3. Contraste: `docker compose down -v` borra el volumen y los datos desaparecen.

## B. Sesión: almacén persistente vs temporal (`SESSION_STORE`)
- `SESSION_STORE=db` (por defecto): solo se guarda sha256(token) en PostgreSQL; al reiniciar el backend la cookie sigue siendo válida.
- `SESSION_STORE=memory`: las sesiones viven solo en el proceso; al reiniciar el backend la cookie deja de valer (GET /api/auth/me -> 401).

## Cookie
`rutabol_sid=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` (+ `Secure` con NODE_ENV=production). El frontend no guarda el token
en localStorage y envía `credentials: "include"`. Defensa CSRF: SameSite=Lax + CORS con origen explícito (FRONTEND_URL).
