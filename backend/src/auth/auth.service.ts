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
import { MemoryService } from '../micros/memory.service';
import type { Profile, Role, Session, User } from '../micros/models';
import { objectBody, password, requiredText, text } from '../micros/input';
import { AccreditationService } from '../shared/accreditation.service';
import { AuditService } from '../shared/audit.service';
import { hashPassword, matchesCode, matchesPassword, randomCode } from '../shared/security';

const TTL = 8 * 60 * 60 * 1000;
const SUSPENDED = 'Tu cuenta está suspendida. Contacta al Centro de Control.';

@Injectable()
export class AuthService {
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
    const code = requiredText(body.code, 'El identificador', 1, 200);
    const photo = requiredText(body.photo, 'La fotografía del rostro', 1, 4_000_000);
    const nextPassword = password(body.password);
    this.accreditation.validateCode(category, code);
    const institution = category === 'general'
      ? undefined
      : requiredText(body.institution, 'La institución', 2, 200);
    const userId = code.toLowerCase();
    if (this.memory.users.has(userId)) {
      throw new ConflictException('Ya existe una cuenta con ese identificador.');
    }
    const user = this.memory.addUser({
      userId, role: 'pasajero', name, category, code, photo, status: 'activo',
    }, nextPassword);
    let devCode: string | undefined;
    if (institution) {
      devCode = this.accreditation.request(userId, { institution, code }).devCode;
    }
    await user.secret;
    return { ...this.login(user.profile), ...(devCode ? { devCode } : {}) };
  }

  private login(profile: Profile): { token: string; profile: Profile } {
    const now = Date.now();
    const token = randomBytes(32).toString('base64url');
    this.memory.sessions.set(token, {
      id: this.memory.nextId('SES'),
      userId: profile.userId,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + TTL,
    });
    this.memory.events.emit();
    return { token, profile: this.accreditation.profile(profile.userId) };
  }

  private blocked(key: string): void {
    const attempt = this.memory.loginAttempts.get(key);
    if (attempt?.blockedUntil && attempt.blockedUntil > Date.now()) {
      throw new HttpException('Demasiados intentos. Intenta de nuevo en 5 minutos.', 429);
    }
    if (attempt && (attempt.blockedUntil ?? attempt.firstAt + 300000) <= Date.now()) {
      this.memory.loginAttempts.delete(key);
    }
  }

  private failure(key: string): never {
    const now = Date.now();
    const attempt = this.memory.loginAttempts.get(key) ?? { failures: 0, firstAt: now };
    attempt.failures += 1;
    if (attempt.failures >= 5) attempt.blockedUntil = now + 300000;
    this.memory.loginAttempts.set(key, attempt);
    this.blocked(key);
    throw new UnauthorizedException('Identificador o contraseña incorrectos.');
  }

  private async authenticate(role: Role, identifier: string, candidate: unknown) {
    const normalized = identifier.toLowerCase();
    const key = `${role}:${normalized}`;
    const actor = { userId: normalized || 'desconocido', role };
    try {
      this.blocked(key);
      const user = [...this.memory.users.values()].find(({ profile }) =>
        profile.role === role &&
        (role === 'chofer'
          ? profile.busId === normalized
          : profile.userId.toLowerCase() === normalized ||
            profile.code?.toLowerCase() === normalized),
      );
      const valid = user ? await matchesPassword(user.secret, candidate) : false;
      this.blocked(key);
      if (!user || !valid) this.failure(key);
      if (user.profile.status === 'suspendido') throw new ForbiddenException(SUSPENDED);
      this.memory.loginAttempts.delete(key);
      if (role === 'chofer') this.memory.seedRequests(user.profile.busId!);
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

  loginPassenger(input: unknown) {
    const body = objectBody(input);
    return this.authenticate('pasajero', text(body.id), body.password);
  }

  loginDriver(input: unknown) {
    const body = objectBody(input);
    return this.authenticate(
      'chofer', `${text(body.line)}-${text(body.internal)}`, body.pin,
    );
  }

  loginControl(input: unknown) {
    const body = objectBody(input);
    return this.authenticate('control', text(body.id), body.password);
  }

  private token(authorization?: string): string {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? '');
    if (!match) throw new UnauthorizedException('Debes iniciar sesión.');
    return match[1];
  }

  authenticateRequest(authorization?: string): { profile: Profile; session: Session } {
    const session = this.memory.sessions.get(this.token(authorization));
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
    this.memory.sessions.delete(this.token(authorization));
    return this.login(profile);
  }

  logout(authorization?: string): { ok: true } {
    this.resolve(authorization);
    this.memory.sessions.delete(this.token(authorization));
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
    return [...this.memory.users.values()].find(
      ({ profile }) =>
        profile.userId.toLowerCase() === normalized ||
        profile.code?.toLowerCase() === normalized,
    );
  }

  recoveryRequest(input: unknown): { sent: true; devCode?: string } {
    const body = objectBody(input);
    const user = this.findUser(requiredText(body.id, 'El identificador', 1, 200));
    if (!user) return { sent: true };
    const devCode = randomCode();
    this.memory.recoveryCodes.set(user.profile.userId, {
      code: devCode, expiresAt: Date.now() + 15 * 60000, attempts: 0,
    });
    this.memory.events.emit();
    return { sent: true, devCode };
  }

  async recoveryConfirm(input: unknown): Promise<{ ok: true }> {
    const body = objectBody(input);
    const next = password(body.newPassword);
    const user = this.findUser(text(body.id));
    const userId = user?.profile.userId ?? '';
    const saved = this.memory.recoveryCodes.get(userId);
    if (!user || !saved || saved.expiresAt <= Date.now()) {
      throw new BadRequestException('El código de recuperación no es válido o expiró.');
    }
    if (!matchesCode(saved.code, text(body.code))) {
      saved.attempts += 1;
      if (saved.attempts >= 5) this.memory.recoveryCodes.delete(userId);
      throw new BadRequestException('El código de recuperación no es válido o expiró.');
    }
    this.validateNewSecret(user, next);
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
      ? undefined : requiredText(body.photo, 'La fotografía', 1, 4_000_000);
    if (name === undefined && photo === undefined) {
      throw new BadRequestException('Indica el nombre o la fotografía.');
    }
    const saved = this.memory.users.get(profile.userId)!.profile;
    if (name !== undefined) saved.name = name;
    if (photo !== undefined) saved.photo = photo;
    this.memory.events.emit();
    return this.accreditation.profile(profile.userId);
  }

  private validateNewSecret(user: User, next: string): void {
    if (user.profile.role === 'chofer' && !/^\d{4}$/.test(next)) {
      throw new BadRequestException('El PIN del chofer debe tener 4 dígitos.');
    }
  }

  async changePassword(input: unknown, authorization?: string): Promise<{ ok: true }> {
    const profile = this.resolve(authorization);
    const body = objectBody(input);
    const user = this.memory.users.get(profile.userId)!;
    if (!await matchesPassword(user.secret, body.current)) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }
    const next = password(body.next);
    this.validateNewSecret(user, next);
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
