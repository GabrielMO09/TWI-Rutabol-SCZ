import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { Roles } from './auth/roles.guard';
import type { AuthRequest } from './auth/roles.guard';
import { MemoryService } from './micros/memory.service';
import { AccreditationService } from './shared/accreditation.service';
import { WalletService } from './shared/wallet.service';
import { FaresService } from './shared/fares.service';
import { EventsService } from './shared/events.service';
import { CredentialsService } from './credentials/credentials.service';
import { PublicService } from './public/public.service';

@Controller('api')
export class PublicController {
  constructor(
    private readonly fares: FaresService,
    private readonly publicService: PublicService,
    private readonly events: EventsService,
  ) {}

  @Get('public/fares')
  publicFares() {
    return this.fares.current();
  }

  @Get('public/lines')
  lines() {
    return this.publicService.lines();
  }

  @Get('public/incidents')
  incidents() {
    return this.publicService.incidents();
  }

  @Get('public/nearby')
  nearby(@Query() query: Record<string, unknown>) {
    return this.publicService.nearby(query);
  }

  @Sse('events')
  stream(@Ip() ip = 'local'): Observable<MessageEvent> {
    return this.events.connect(ip);
  }
}

@Controller('api')
@Roles('pasajero')
export class PassengerController {
  constructor(
    private readonly accreditation: AccreditationService,
    private readonly wallet: WalletService,
    private readonly credentials: CredentialsService,
  ) {}

  @Get('accreditation/me')
  myAccreditation(@Req() request: AuthRequest) {
    return this.accreditation.get(request.profile.userId);
  }

  @Post('accreditation/request')
  async requestAccreditation(@Req() request: AuthRequest, @Body() body: unknown) {
    const fields = this.accreditation.prepare(request.profile.userId, body);
    await this.accreditation.verifyEnrollment(fields);
    return this.accreditation.startRequest(request.profile.userId, fields);
  }

  @Post('accreditation/confirm-email')
  confirmEmail(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.accreditation.confirmEmail(request.profile.userId, body);
  }

  @Get('wallet/me')
  myWallet(@Req() request: AuthRequest) {
    return this.wallet.get(request.profile.userId);
  }

  @Get('wallet/recharges')
  recharges(@Req() request: AuthRequest) {
    return this.wallet.recharges(request.profile.userId);
  }

  @Post('wallet/recharge')
  recharge(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.wallet.recharge(request.profile.userId, body);
  }

  @Post('wallet/block')
  block(@Req() request: AuthRequest) {
    return this.wallet.setBlocked(request.profile.userId, true);
  }

  @Post('wallet/unblock')
  unblock(@Req() request: AuthRequest) {
    return this.wallet.setBlocked(request.profile.userId, false);
  }

  @Post('wallet/link-physical')
  link(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.wallet.linkPhysical(request.profile.userId, body);
  }

  @Post('credentials/me')
  credential(@Req() request: AuthRequest) {
    return this.credentials.issue(request.profile.userId);
  }
}

@Controller('api/credentials')
@Roles('chofer')
export class CredentialsController {
  constructor(private readonly credentials: CredentialsService) {}

  @Post('verify')
  verify(@Body() body: unknown) {
    return this.credentials.verify(body);
  }
}

@Controller('api/control')
@Roles('control')
export class ControlController {
  constructor(
    private readonly accreditation: AccreditationService,
    private readonly wallet: WalletService,
    private readonly fares: FaresService,
    private readonly memory: MemoryService,
  ) {}

  @Get('accreditations')
  accreditations(@Query('status') status?: string) {
    return this.accreditation.list(status);
  }

  @Post('accreditations/:id/decision')
  decision(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.accreditation.decision(request.profile, id, body);
  }

  @Post('wallet/adjust')
  adjust(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.wallet.adjust(request.profile, body);
  }

  @Get('fares')
  fareHistory() {
    return this.fares.history();
  }

  @Patch('fares')
  updateFares(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.fares.update(request.profile, body);
  }

  @Get('audit')
  audit(@Query('limit') value?: string) {
    const limit = value === undefined ? 200 : Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
      throw new BadRequestException('El límite debe ser un entero entre 1 y 10000.');
    }
    return structuredClone(this.memory.audit.slice(-limit).reverse());
  }
}
