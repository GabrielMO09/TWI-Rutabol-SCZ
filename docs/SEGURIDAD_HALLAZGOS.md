# Revisión de seguridad defensiva — Rutabol-SCZ (19-nov-2026)

Alcance: revisión de código del backend NestJS (control de acceso, reglas de negocio, validación de entrada,
exposición de datos) y puntos del frontend. Método: lectura de código (no se ejecutaron ataques contra una instancia).
Cada hallazgo indica archivo, riesgo y corrección. Los marcados **[ya corregido]** o **[it.failing]** salen de la revisión
anterior de la cookie (`backend/src/auth/cookie-security.spec.ts`).

## Resumen
| Sev. | # | Hallazgo |
|---|---|---|
| Crítica | 1 | Recarga "simulada" acredita saldo real sin pago |
| Alta | 2 | Registro sin autenticar: usuarios con foto de 4 MB sin tope por IP (agotamiento de memoria/BD) |
| Alta | 3 | Login fallido de control escribe en auditoría un identificador sin límite de tamaño (inundación de auditoría/BD) |
| Alta | 4 | Reclamos con evidencia de 4 MB sin límite por usuario (memoria/BD) |
| Media | 5 | `loginAttempts` usa como clave el identificador sin límite de longitud |
| Media | 6 | PIN de chofer de 4 dígitos + bloqueo solo en memoria |
| Media | 7 | Recuperación de contraseña sin límite por cuenta: se pueden pedir códigos nuevos sin fin |
| Media | 8 | El token de sesión viaja también en el JSON [it.failing] |
| Media | 9 | Foto de perfil sin validar (URL externa, cualquier cadena): rastreo de quien la ve |
| Media | 10 | Datos internos de incidentes publicados sin autenticar |
| Media | 11 | Ajuste de saldo por una sola persona de control, sin tope ni segunda aprobación |
| Media | 12 | Sesión revocada puede revivir si falla el guardado en PostgreSQL (SESSION_STORE=db) |
| Baja | 13 | Bloqueo de login por identificador permite bloquear a otra persona (DoS de cuenta) |
| Baja | 14 | Contraseña mínima de 6 caracteres sin otra regla |
| Baja | 15 | Tiempo de respuesta del login distingue cuentas existentes |
| Baja | 16 | Login nuevo no revoca la sesión presentada [it.failing] |
| Baja | 17 | `GET /api/credentials/me` cambia estado [it.failing] |
| Baja | 18 | SSE `/api/events` público, sin límite de conexiones, y `emit()` amplifica |
| Baja | 19 | Recuperación y registro pueden colisionar identificadores entre roles (`findUser` sin filtro de rol) |
| Baja | 20 | `CREDENTIAL_SECRET` con valor aleatorio por proceso |
| Baja | 21 | Credenciales demo visibles en pantallas de login |
| Baja | 22 | Sin cabeceras de seguridad en el frontend (`next.config.ts`) |
| Info | — | `npm audit`: 0 vulnerabilidades (backend y frontend); SQL todo parametrizado; sin `.env` en git; sin sinks XSS en el frontend |

## Control de acceso y reglas de negocio

### 1. [Crítica] Recarga simulada acredita saldo sin pago — `shared/wallet.service.ts:79-141`
`recharge()` crea la recarga y 2 s después `settle()` suma `amount` al saldo (salvo importes terminados en .99).
No hay pasarela. Cualquier pasajero logueado puede recargar hasta Bs 500 por petición con una `idempotencyKey` nueva
cada vez (600 peticiones/min por IP) y pagar pasajes gratis.
**Corrección:** antes de producción, `settle()` solo debe ejecutarse desde la confirmación firmada de una pasarela
(webhook con firma) o por una persona de control. Mientras tanto, protegerlo con una bandera
(`ENABLE_DEMO_RECHARGE=true`, apagada por defecto) y rechazar la ruta si está apagada. Añadir tope diario por cuenta.

### 2. [Alta] Registro sin tope — `auth/auth.service.ts:31-83`
`POST /api/auth/register` es público, acepta `photo` de hasta 4 000 000 caracteres y crea el usuario en memoria y en PostgreSQL.
Con CI/correos distintos, el límite global de 600/min por IP permite ~2,4 GB/min.
**Corrección:** límite específico (`@Throttle` de 5 registros/hora por IP); validar la foto como `data:image/(jpeg|png|webp);base64,`
y bajar el máximo a ~300 KB; reducir el límite del cuerpo JSON global (hoy 5 MB) y subirlo solo en las rutas que lo necesitan.

### 3. [Alta] Inundación de auditoría — `auth/auth.service.ts:120-155`
Cada intento fallido de `login/control` ejecuta `audit.log(actor, 'auth.login.control', normalized, ...)` con `normalized`
= el `id` enviado, sin límite de longitud (hasta 5 MB). Sin autenticarse, se llenan `memory.audit` y la tabla `auditoria`
(que además no se puede borrar). También emite un evento SSE por cada intento.
**Corrección:** recortar el identificador a 120 caracteres antes de usarlo como `target`/clave; registrar solo el primer fallo de
cada ventana por IP; limitar `memory.audit` en memoria (guardar en BD y mantener solo los últimos N).

### 4. [Alta] Reclamos sin tope — `claims/claims.service.ts:18-53`
Un pasajero puede crear reclamos ilimitados con `evidence` de 4 MB. **Corrección:** máximo de reclamos abiertos por usuario (p. ej. 5),
evidencia ≤ 300 KB y solo `data:image/...` o URL `https` de ≤ 500 caracteres.

### 6. [Media] PIN de chofer — `auth.service.ts:162-167`, `control.service.ts:89`
PIN de 4 dígitos (10 000 combinaciones) con 5 intentos cada 5 min por unidad; el contador vive en memoria y se pierde al reiniciar.
Un atacante paciente lo agota en días, y puede bloquear a un chofer a propósito (ver 13).
**Corrección:** PIN de 6 dígitos o contraseña; bloqueo exponencial persistido; además del bloqueo por cuenta, un límite por IP.

### 7. [Media] Recuperación de contraseña — `auth.service.ts:266-299`
El código de 6 dígitos admite 5 intentos, pero `recovery/request` genera un código nuevo sin límite, así que el contador se reinicia.
Hoy el código no se envía por correo (solo `devCode`), pero cuando se conecte el correo habrá fuerza bruta distribuida.
**Corrección:** límite de peticiones por cuenta (3/hora) y por IP; invalidar el código tras 5 fallos y exigir espera de 15 min
antes de emitir otro; auditar la recuperación de cuentas `control` y `chofer` y exigir paso adicional.

### 11. [Media] Ajuste de saldo — `wallet.service.ts:160-182`
Una sola persona de control puede sumar hasta ±Bs 1 000 000 a cualquier usuario. Queda auditado, pero no hay control previo.
**Corrección:** tope por ajuste (p. ej. Bs 200), segunda aprobación para montos mayores, y alerta al detectar muchos ajustes.

### 12. [Media] Revocación que puede perderse — `persistence/persistence.service.ts`
Si falla el guardado de una revocación (logout/refresh) y el proceso reinicia, la hidratación puede aceptar el token otra vez.
**Corrección:** que `logout` espere a que se guarde la revocación (o falle) cuando `SESSION_STORE=db`; reintentar con cola persistente.

### 13. [Baja] Bloqueo de cuenta ajena — `auth.service.ts:100-118`
La clave `role:identificador` se bloquea 5 min tras 5 fallos desde cualquier IP: cualquiera puede impedir que un usuario inicie sesión.
**Corrección:** contar fallos por (cuenta, IP) y exigir CAPTCHA o retardo progresivo antes de bloquear a la cuenta por completo.

### 16-17. [Baja] Login que no revoca y GET que cambia estado
Ver `cookie-security.spec.ts` (`it.failing`). Corrección: en `login`, revocar la sesión que llega en cookie/Bearer; convertir
`GET /api/credentials/me` en `POST` y actualizar `carnet/page.tsx:27`.

### 19. [Baja] `findUser` sin filtro de rol — `auth.service.ts:255-264`
La recuperación busca por userId/código/CI/correo en todos los roles; un pasajero con `code` (RUDE de 8–20 caracteres) que coincida con
un identificador de otra cuenta puede crear ambigüedad (`find` devuelve el primero). **Corrección:** prohibir que el `code`
coincida con cualquier `userId`/`busId` existente y filtrar `findUser` por el rol de la ruta.

## Validación de entrada y exposición de datos

### 5. [Media] Claves sin límite en memoria — `auth.service.ts:121-122`
`text(body.id)` no tiene tope y se usa como clave de `loginAttempts` (durante ≥ 5 min). **Corrección:** `requiredText(body.id, ..., 1, 120)`.

### 9. [Media] Foto sin validar — `auth.service.ts:55`, `updateProfile`
`photo` acepta cualquier texto; el frontend la pone en `<img src>` (`chofer/validacion/page.tsx:49`, `DriverValidation.tsx:101`).
Un pasajero puede poner una URL externa: al abrirla el chofer o control, su navegador contacta al servidor del atacante (revela IP/uso).
No hay XSS (las imágenes no ejecutan `javascript:`). **Corrección:** aceptar solo `data:image/(jpeg|png|webp);base64,...` con tamaño máximo
y, mejor, volver a codificar la imagen en el servidor.

### 10. [Media] Datos públicos — `public/public.service.ts:25-45`, `ops/ops.service.ts:180-210`
`/api/public/incidents` y `/api/world` publican la `description` escrita por el chofer (3000 caracteres) y los mensajes de alerta
(`Incidente INC-...: <descripción>`). Puede incluir datos de heridos o personas. **Corrección:** publicar solo tipo/severidad/zona;
dejar la descripción para control.

### 14. [Baja] Contraseñas — `micros/input.ts:password`
Mínimo 6 caracteres. **Corrección:** mínimo 8–10 y lista de contraseñas comunes; el PIN de chofer es aparte.

### 15. [Baja] Enumeración por tiempo — `auth.service.ts:135`
Con usuario inexistente no se ejecuta `scrypt`. **Corrección:** ejecutar un hash ficticio para igualar el tiempo.

### 18. [Baja] SSE y amplificación — `rutabol.controller.ts:53`, `shared/events.service.ts`
Sin autenticación ni límite de conexiones, y cada acción (incluidos los login fallidos) hace `emit()` y obliga a todos los clientes a refrescar.
**Corrección:** límite de conexiones por IP, agrupar emisiones (debounce 500 ms) y no emitir en operaciones que no cambian datos públicos.

### 20-22. [Baja] Configuración
- `CREDENTIAL_SECRET`: si falta, es aleatorio por proceso (los QR mueren al reiniciar). Definirlo en `.env` de producción.
- Quitar `control123` y "PIN 1234" de `frontend/app/acceso/control/page.tsx:66` y `acceso/chofer/page.tsx:54`.
- Frontend: añadir en `next.config.ts` cabeceras `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`.

## Lo que se revisó y está bien
- Todas las consultas SQL usan parámetros (`$n`); sin concatenación.
- Rutas por rol: cada ruta mutadora exige `@Roles(...)` o `auth.require*`; el chofer solo opera su unidad (`requireDriver(id)`).
- Pasajeros: `tickets/me`, `claims/me`, `wallet/me` filtran por `request.profile.userId`; el reclamo con `ticketId` valida que el ticket sea del usuario.
- Dinero: `money()` valida finitud, rango y 2 decimales; `move()` es idempotente por `ref`+tipo y no permite saldo negativo.
- Credencial QR: HMAC-SHA256, un solo uso, 60 s; `timingSafeEqual`.
- Reporte CSV: neutraliza `= + - @` (inyección de fórmulas).
- Contraseñas: scrypt con sal; sesiones: solo `sha256(token)`.
- `InputPipe` bloquea `__proto__`/`constructor`/`prototype` y limita formatos de ids y consultas.
- Dependencias: `npm audit` sin vulnerabilidades.

## Orden sugerido de corrección
1. #1 (recarga), #2, #3, #4, #5: son los que se pueden explotar sin credenciales o con una cuenta cualquiera y rompen dinero o disponibilidad.
2. #6, #7, #11, #12, #9, #10.
3. Baja: #13-#22.

## Límites de esta revisión
Solo lectura de código: no se ejecutaron ataques reales ni pruebas de carga, y no se revisaron `persistence/*.store.ts` ni los servicios
`institutions`/`stops` a fondo. Los hallazgos 2-5 se infieren del código y conviene confirmarlos con una prueba antes de priorizarlos.

## Estado de corrección (19-nov-2026)
- Corregidos: #1, #2, #3, #4, #5 (altas y recorte de identificador), #6, #7, #8, #11 (ajuste Bs 500/op y 2000/día; reembolso máx. Bs 200),
  #13 (bloqueo por cuenta+IP y tope global de 50 fallos/h), #14 (mín. 8 y lista de comunes), #15 (hash ficticio), #16, #17 (ahora POST),
  #18 (20 conexiones SSE por IP y emisión agrupada 300 ms), #19, #20 (producción exige CREDENTIAL_SECRET), #21 (credenciales demo quitadas de los 3 logins),
  #22 (cabeceras CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS en producción).
- Pendientes: #9 (foto: depende de la decisión de foto opcional), #10 (descripciones de incidentes públicas), #12 (revocación y fallo de guardado en PG).
- Límites conocidos: bloqueos y contadores viven en memoria (se pierden al reiniciar); la CSP usa 'unsafe-inline' y no está probada en navegador.
