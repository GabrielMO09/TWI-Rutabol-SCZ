import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.guard';
import type { AuthRequest } from '../auth/roles.guard';
import { InstitutionsService } from './institutions.service';

@Controller('api/control/institutions')
@Roles('control')
export class ControlInstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}

  @Get()
  list() {
    return this.institutions.list();
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.institutions.create(request.profile, body);
  }

  @Patch()
  update(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.institutions.update(request.profile, body);
  }
}

@Controller('api/public/institutions')
export class PublicInstitutionsController {
  constructor(private readonly institutions: InstitutionsService) {}

  @Get()
  list() {
    return this.institutions.list(true).map(({ id, type, name }) => ({ id, type, name }));
  }
}
