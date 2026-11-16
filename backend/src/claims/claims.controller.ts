import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.guard';
import type { AuthRequest } from '../auth/roles.guard';
import { MemoryService } from '../micros/memory.service';
import { ClaimsService } from './claims.service';

@Controller('api')
@Roles('pasajero')
export class ClaimsController {
  constructor(
    private readonly claims: ClaimsService,
    private readonly memory: MemoryService,
  ) {}

  @Post('claims')
  create(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.claims.create(request.profile, body);
  }

  @Get('claims/me')
  mine(@Req() request: AuthRequest) {
    return this.claims.list(request.profile.userId);
  }

  @Get('notifications/me')
  notifications(@Req() request: AuthRequest) {
    return structuredClone(
      [...(this.memory.notifications.get(request.profile.userId) ?? [])].reverse(),
    );
  }

  @Post('notifications/read-all')
  readAll(@Req() request: AuthRequest) {
    for (const item of this.memory.notifications.get(request.profile.userId) ?? []) {
      item.read = true;
    }
    this.memory.events.emit();
    return { ok: true };
  }
}
