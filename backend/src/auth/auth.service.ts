import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  LOGIN_ACCOUNT_WINDOW, LOGIN_ATTEMPT_WINDOW, LOGIN_STRIKE_TTL, MemoryService, RECOVERY_REQUEST_WINDOW,
} from '../micros/memory.service';
import type { Profile, Role, Session, User } from '../micros/models';
import { imageData, objectBody, password, requiredText, text } from '../micros/input';
import { AccreditationService, ACCOUNT_CONFLICT, registrationEmail } from '../shared/accreditation.service';
import { AuditService } from '../shared/audit.service';
import {
  exposeDevCode, hashPassword, matchesCode, matchesPassword, randomCode, sessionKey,
} from '../shared/security';
import { SESSION_MAX_AGE, sessionCookieToken } from '../shared/session-cookie';

const RECOVERY_CODE_TTL = 15 * 60_000;
const LOGIN_ACCOUNT_BLOCK = 15 * 60_000;
const SUSPENDED = 'Tu cuenta está suspendida. Contacta al Centro de Control.';

@Injectable()
export class AuthService {
  private readonly dummySecret = hashPassword(randomBytes(32).toString('hex'));

  constructor(
    private readonly memory: MemoryService,
    private readonly accreditation: AccreditationService,
    private readonly audit: AuditService,
  ) {}

  async register(input: unknown): Promise<{
    token: string;
    profile: Profile;
    devCode?: string;
  }> {
    const body = objectBody(input);
    if (body.acceptTerms !== true) {
      throw new BadRequestException('Debes aceptar los términos y la política de privacidad.');
    }
    const name = requiredText(body.name, 'El nombre completo', 3, 120);
    const category = body.category;
    if (category !== 'general' && category !== 'escolar' && category !== 'universitario') {
      throw new BadRequestException('Selecciona una categoría válida.');
    }
    const ci = requiredText(body.ci, 'El CI', 5, 15).toUpperCase();
    if (!/^\d{5,12}(?:-[0-9][A-Z])?$/.test(ci)) {
      throw new BadRequestException('Ingresa un CI válido, con complemento si corresponde.');
    }
    const email = registrationEmail(body.email);
    const localPhone = requiredText(body.phone, 'El teléfono', 8, 30)
      .replace(/[\s()-]/g, '').replace(/^\+591/, '');
    if (!/^[23467]\d{7}$/.test(localPhone)) {
      throw new BadRequestException('Ingresa un teléfono boliviano de 8 dígitos.');
    }
    const photo = imageData(body.photo, 'La fotografía del rostro', 200_000);
    const nextPassword = password(body.password);
    if (body.passwordConfirmation !== nextPassword) {
      throw new BadRequestException('Las contraseñas deben coincidir.');
    }
    const suppliedCode = text(body.code);
    const code = category === 'general' ? ci : category === 'universitario'
      ? email : suppliedCode;
    const userId = code.toLowerCase();
    const normalizedSuppliedCode = suppliedCode.toLowerCase();
    const secret = await hashPassword(nextPassword);

    for (const { profile } of this.memory.users.values()) {
      const existingCi = profile.ci ?? (profile.category === 'general' ? profile.code : undefined);
      const existingEmail = profile.email ?? (profile.userId.includes('@') ? profile.userId : undefined);
      const identifiers = [profile.userId, existingCi, existingEmail, profile.busId];
      const codeConflict = identifiers.some((identifier) => {
        const normalized = identifier?.toLowerCase();
        return normalized !== undefined &&
          (normalized === userId || (normalizedSuppliedCode !== '' && normalized === normalizedSuppliedCode));
      });
      if (codeConflict || existingCi?.toUpperCase() === ci || existingEmail?.toLowerCase() === email) {
        throw new ConflictException(ACCOUNT_CONFLICT);
      }
    }

    if (category === 'escolar') requiredText(body.code, 'El código RUDE', 8, 20);
    const request = { institution: body.institution, code, institutionalCode: body.institutionalCode };
    const prepared = category === 'general'
      ? undefined : this.accreditation.prepareRequest(category, request);
    const user = this.memory.addUser({
      userId, role: 'pasajero', name, category, code, photo, status: 'activo',
      ci, email, phone: `+591${localPhone}`, acceptedTermsAt: Date.now(),
    }, secret);
    const devCode = prepared && this.accreditation.startRequest(userId, prepared).devCode;
    return { ...this.login(user.profile), ...(devCode && exposeDevCode() ? { devCode } : {}) };
  }

  private login(profile: Profile): { token: string; profile: Profile } {
    const now = Date.now();
    const token = randomBytes(32).toString('base64url');
    const key = sessionKey(token);
    this.memory.sessions.set(key, {
      id: key.slice(0, 16),
      userId: profile.userId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + SESSION_MAX_AGE * 1000,
    });
    this.memory.events.emit();
    return { token, profile: this.accreditation.profile(profile.userId) };
  }

  private checkBlock(blockedUntil: number, now: number): void {
    const remaining = blockedUntil - now;
    if (remaining > 0) {
      const minutes = Math.ceil(remaining / 60_000);
      throw new HttpException(
        `Demasiados intentos. Intenta de nuevo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`, 429,
      );
    }
  }

  private blocked(key: string, accountKey: string): void {
    const now = Date.now();
    this.checkBlock(this.memory.loginAccountAttempts.get(accountKey)?.blockedUntil ?? 0, now);
    const attempt = this.memory.loginAttempts.get(key);
    if (!attempt) return;
    this.checkBlock(attempt.blockedUntil ?? 0, now);
    const expiresAt = attempt.strikes > 0
      ? attempt.lastAt + LOGIN_STRIKE_TTL : attempt.firstAt + LOGIN_ATTEMPT_WINDOW;
    if (expiresAt <= now) this.memory.loginAttempts.delete(key);
  }

  private failure(key: string, accountKey: string): never {
    const now = Date.now();
    const account = this.memory.loginAccountAttempts.get(accountKey) ?? { failedAt: [], blockedUntil: 0 };
    account.failedAt = account.failedAt.filter((at) => at + LOGIN_ACCOUNT_WINDOW > now);
    account.failedAt.push(now);
    if (account.failedAt.length >= 50) {
      account.failedAt = [];
      account.blockedUntil = now + LOGIN_ACCOUNT_BLOCK;
    }
    this.memory.loginAccountAttempts.set(accountKey, account);

    const attempt = this.memory.loginAttempts.get(key) ?? {
      failures: 0, firstAt: now, lastAt: now, strikes: 0,
    };
    if (attempt.failures === 0 || attempt.firstAt + LOGIN_ATTEMPT_WINDOW <= now) {
      attempt.failures = 0;
      attempt.firstAt = now;
    }
    attempt.failures += 1;
    attempt.lastAt = now;
    if (attempt.failures >= 5) {
      attempt.strikes += 1;
      attempt.failures = 0;
      attempt.blockedUntil = now + Math.min(
        LOGIN_ATTEMPT_WINDOW * 2 ** (attempt.strikes - 1), LOGIN_STRIKE_TTL,
      );
    }
    this.memory.loginAttempts.set(key, attempt);
    this.blocked(key, accountKey);
    throw new UnauthorizedException('Identificador o contraseña incorrectos.');
  }

  private async authenticate(
    role: Role, identifier: string, candidate: unknown, ip: string,
    authorization?: string, cookie?: string,
  ) {
    // Tope de 120: el identificador se usa como clave de intentos y como destino de auditoría (antes no tenía límite).
    const normalized = identifier.slice(0, 120).toLowerCase();
    const accountKey = `${role}:${normalized}`;
    const key = `${accountKey}:${ip}`;
    const actor = { userId: normalized || 'desconocido', role };
    try {
      this.blocked(key, accountKey);
      const user = [...this.memory.users.values()].find(({ profile }) =>
        profile.role === role &&
        (role === 'chofer'
          ? profile.busId === normalized
          : profile.userId.toLowerCase() === normalized ||
            profile.code?.toLowerCase() === normalized ||
            profile.ci?.toLowerCase() === normalized ||
            profile.email?.toLowerCase() === normalized),
      );
      const valid = await matchesPassword(user?.secret ?? this.dummySecret, candidate);
      this.blocked(key, accountKey);
      if (!user || !valid) this.failure(key, accountKey);
      if (user.profile.status === 'suspendido') throw new ForbiddenException(SUSPENDED);
      this.memory.loginAttempts.delete(key);
      if (role === 'chofer') this.memory.seedRequests(user.profile.busId!);
      this.revokePresentedSession(authorization, cookie);
      const result = this.login(user.profile);
      if (role === 'control') {
        this.audit.log(user.profile, 'auth.login.control', user.profile.userId, 'ok', 'Sesión iniciada.');
      }
      return result;
    } catch (error) {
      if (role === 'control') {
        this.audit.log(
          actor, 'auth.login.control', normalized, 'error',
          error instanceof Error ? error.message : 'Inicio de sesión rechazado.',
        );
      }
      throw error;
    }
  }

  loginPassenger(input: unknown, ip = 'local', authorization?: string, cookie?: string) {
    const body = objectBody(input);
    return this.authenticate('pasajero', text(body.id), body.password, ip, authorization, cookie);
  }

  loginDriver(input: unknown, ip = 'local', authorization?: string, cookie?: string) {
    const body = objectBody(input);
    return this.authenticate(
      'chofer', `${text(body.line)}-${text(body.internal)}`, body.pin, ip, authorization, cookie,
    );
  }

  loginControl(input: unknown, ip = 'local', authorization?: string, cookie?: string) {
    const body = objectBody(input);
    return this.authenticate('control', text(body.id), body.password, ip, authorization, cookie);
  }

  private revokePresentedSession(authorization?: string, cookie?: string): void {
    const cookieToken = sessionCookieToken(cookie);
    const header = cookieToken === undefined ? authorization : `Bearer ${cookieToken}`;
    if (header === undefined) return;
    try {
      this.authenticateRequest(header);
      this.memory.sessions.delete(sessionKey(this.token(header)));
    } catch (error) {
      if (!(error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException)) throw error;
    }
  }

  private token(authorization?: string): string {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? '');
    if (!match) throw new UnauthorizedException('Debes iniciar sesión.');
    return match[1];
  }

  authenticateRequest(authorization?: string, cookie?: string): { profile: Profile; session: Session } {
    const cookieToken = sessionCookieToken(cookie);
    const token = this.token(cookieToken === undefined ? authorization : `Bearer ${cookieToken}`);
    const session = this.memory.sessions.get(sessionKey(token));
    if (!session) throw new UnauthorizedException('La sesión no es válida.');
    if (session.expiresAt <= Date.now()) {
      throw new UnauthorizedException('La sesión expiró.');
    }
    const profile = this.accreditation.profile(session.userId);
    if (profile.status === 'suspendido') throw new ForbiddenException(SUSPENDED);
    session.lastSeenAt = Date.now();
    return { profile, session: { ...session } };
  }

  resolve(authorization?: string): Profile {
    return this.authenticateRequest(authorization).profile;
  }

  requirePassenger(authorization?: string): Profile {
    return this.requireRole(authorization, 'pasajero');
  }

  requireRole(authorization: string | undefined, role: Role): Profile {
    const profile = this.resolve(authorization);
    if (profile.role !== role) throw new ForbiddenException('No tienes permiso para esta acción.');
    return profile;
  }

  requireDriver(authorization?: string, busId?: string): Profile {
    const profile = this.requireRole(authorization, 'chofer');
    if (busId !== undefined && profile.busId !== busId) {
      throw new ForbiddenException('No tienes permiso para operar esta unidad.');
    }
    return profile;
  }

  refresh(authorization?: string) {
    const profile = this.resolve(authorization);
    this.memory.sessions.delete(sessionKey(this.token(authorization)));
    return this.login(profile);
  }

  logout(authorization?: string): { ok: true } {
    this.resolve(authorization);
    this.memory.sessions.delete(sessionKey(this.token(authorization)));
    this.memory.events.emit();
    return { ok: true };
  }

  sessions(authorization?: string) {
    const current = this.authenticateRequest(authorization);
    return [...this.memory.sessions.values()]
      .filter((session) =>
        session.userId === current.profile.userId && session.expiresAt > Date.now(),
      )
      .map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        current: session.id === current.session.id,
      }));
  }

  revokeSession(id: string, authorization?: string): { ok: true } {
    const profile = this.resolve(authorization);
    const entry = [...this.memory.sessions.entries()].find(
      ([, session]) => session.id === id && session.userId === profile.userId,
    );
    if (!entry) throw new NotFoundException('Sesión no encontrada.');
    this.memory.sessions.delete(entry[0]);
    this.memory.events.emit();
    return { ok: true };
  }

  private findUser(identifier: string): User | undefined {
    const normalized = identifier.toLowerCase();
    if (!normalized) return undefined;
    let match: User | undefined;
    for (const user of this.memory.users.values()) {
      const { profile } = user;
      if (profile.role !== 'pasajero' && profile.role !== 'control' && profile.role !== 'chofer') continue;
      const identifiers = [profile.userId, profile.code, profile.ci, profile.email];
      if (profile.role === 'chofer') identifiers.push(profile.busId);
      if (!identifiers.some((value) => value?.toLowerCase() === normalized)) continue;
      if (match) return undefined;
      match = user;
    }
    return match;
  }

  recoveryRequest(input: unknown): { sent: true; devCode?: string } {
    const body = objectBody(input);
    const user = this.findUser(requiredText(body.id, 'El identificador', 1, 200));
    if (!user) return { sent: true };
    const userId = user.profile.userId;
    const now = Date.now();
    const requests = this.memory.recoveryRequests.get(userId) ?? { issuedAt: [], blockedUntil: 0 };
    if (requests.blockedUntil > now) return { sent: true };
    const issuedAt = requests.issuedAt.filter((at) => at + RECOVERY_REQUEST_WINDOW > now);
    if (issuedAt.length >= 3) return { sent: true };

    const devCode = randomCode();
    this.memory.recoveryRequests.set(userId, { issuedAt: [...issuedAt, now], blockedUntil: 0 });
    this.memory.recoveryCodes.set(userId, {
      code: devCode, expiresAt: now + RECOVERY_CODE_TTL, attempts: 0,
    });
    this.memory.events.emit();
    return exposeDevCode() ? { sent: true, devCode } : { sent: true };
  }

  async recoveryConfirm(input: unknown): Promise<{ ok: true }> {
    const body = objectBody(input);
    const user = this.findUser(text(body.id));
    const next = this.validateNewSecret(user, body.newPassword);
    const userId = user?.profile.userId ?? '';
    const saved = this.memory.recoveryCodes.get(userId);
    if (!user || !saved || saved.expiresAt <= Date.now()) {
      throw new BadRequestException('El código de recuperación no es válido o expiró.');
    }
    if (!matchesCode(saved.code, text(body.code))) {
      saved.attempts += 1;
      if (saved.attempts >= 5) {
        this.memory.recoveryCodes.delete(userId);
        const requests = this.memory.recoveryRequests.get(userId);
        this.memory.recoveryRequests.set(userId, {
          issuedAt: requests?.issuedAt ?? [],
          blockedUntil: Date.now() + RECOVERY_CODE_TTL,
        });
      }
      throw new BadRequestException('El código de recuperación no es válido o expiró.');
    }
    this.memory.recoveryCodes.delete(userId);
    user.secret = hashPassword(next);
    await user.secret;
    this.revokeAll(userId);
    this.memory.events.emit();
    return { ok: true };
  }

  updateProfile(input: unknown, authorization?: string): Profile {
    const profile = this.resolve(authorization);
    const body = objectBody(input);
    const name = body.name === undefined
      ? undefined : requiredText(body.name, 'El nombre completo', 3, 120);
    const photo = body.photo === undefined
      ? undefined : imageData(body.photo, 'La fotografía del rostro', 200_000);
    if (name === undefined && photo === undefined) {
      throw new BadRequestException('Indica el nombre o la fotografía.');
    }
    const saved = this.memory.users.get(profile.userId)!.profile;
    if (name !== undefined) saved.name = name;
    if (photo !== undefined) saved.photo = photo;
    this.memory.events.emit();
    return this.accreditation.profile(profile.userId);
  }

  private validateNewSecret(user: User | undefined, next: unknown): string {
    if (user?.profile.role !== 'chofer') return password(next);
    if (typeof next !== 'string' || !/^\d{4}$/.test(next)) {
      throw new BadRequestException('El PIN del chofer debe tener 4 dígitos.');
    }
    return next;
  }

  async changePassword(input: unknown, authorization?: string): Promise<{ ok: true }> {
    const profile = this.resolve(authorization);
    const body = objectBody(input);
    const user = this.memory.users.get(profile.userId)!;
    if (!await matchesPassword(user.secret, body.current)) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }
    const next = this.validateNewSecret(user, body.next);
    user.secret = hashPassword(next);
    await user.secret;
    this.revokeAll(profile.userId);
    this.memory.events.emit();
    return { ok: true };
  }

  private revokeAll(userId: string): void {
    for (const [token, session] of this.memory.sessions) {
      if (session.userId === userId) this.memory.sessions.delete(token);
    }
  }
}
