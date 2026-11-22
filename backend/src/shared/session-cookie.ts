import type { NextFunction, Request, Response } from 'express';

const COOKIE_NAME = 'rutabol_sid';
export const SESSION_MAX_AGE = 8 * 60 * 60;

const TOKEN_FORMAT = /^[A-Za-z0-9._~-]+$/;
const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);
const INVALID = "Bearer invalid"; // fuerza 401: cookie duplicada o mal formada

export function sessionCookieToken(header?: string): string | undefined {
  const values: string[] = [];
  for (const part of header?.split(";") ?? []) {
    const cookie = part.trim();
    if (cookie.startsWith(`${COOKIE_NAME}=`)) values.push(cookie.slice(COOKIE_NAME.length + 1));
  }
  if (values.length === 0) return undefined;
  // Duplicada o con formato raro: no se adivina cual vale, se rechaza.
  return values.length === 1 && TOKEN_FORMAT.test(values[0]) ? values[0] : "invalid";
}

export function sessionCookieAuthorization(request: Request, response: Response, next: NextFunction): void {
  // Respuestas de sesion/autenticadas nunca se guardan en cache.
  if (request.headers.cookie || request.url.startsWith("/api/auth")) {
    response.setHeader("Cache-Control", "no-store");
  }
  const token = sessionCookieToken(request.headers.cookie);
  if (token !== undefined) {
    // CSRF: con sesion por cookie, un POST/PATCH/PUT/DELETE debe venir del frontend y como JSON (no form/text-plain, que no exigen preflight).
    if (MUTATING.has(request.method)) {
      const origin = request.headers.origin;
      const allowed = process.env.FRONTEND_URL ?? "http://localhost:3000";
      const type = request.headers["content-type"];
      if (origin && origin !== allowed && !(process.env.NODE_ENV === "test")) {
        response.status(403).json({ message: "Origen no permitido." });
        return;
      }
      if (type && !type.toLowerCase().startsWith("application/json")) {
        response.status(415).json({ message: "Se requiere application/json." });
        return;
      }
    }
    request.headers.authorization = token === "invalid" ? INVALID : `Bearer ${token}`;
  }
  next();
}

export function setSessionCookie(response: Response, token?: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${token ?? ''}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${token === undefined ? 0 : SESSION_MAX_AGE}${secure}`,
  );
}
