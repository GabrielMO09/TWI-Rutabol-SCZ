import {
  applyDecorators,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Profile, Role, Session } from '../micros/models';
import { AuthService } from './auth.service';

export interface AuthRequest extends Request {
  profile: Profile;
  session: Session;
}

const ROLE_KEY = 'rutabol:roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const { profile, session } = this.auth.authenticateRequest(request.headers.authorization);
    request.profile = profile;
    request.session = session;
    const roles = this.reflector.getAllAndOverride<Role[]>(
      ROLE_KEY, [context.getHandler(), context.getClass()],
    );
    if (roles?.length && !roles.includes(profile.role)) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }
    return true;
  }
}

export function Roles(...roles: Role[]) {
  return applyDecorators(SetMetadata(ROLE_KEY, roles), UseGuards(RolesGuard));
}
