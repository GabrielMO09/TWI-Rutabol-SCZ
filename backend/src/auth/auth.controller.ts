import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { setSessionCookie } from '../shared/session-cookie';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  async register(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const { token, profile, devCode } = await this.auth.register(body);
    setSessionCookie(response, token);
    return { profile, ...(devCode === undefined ? {} : { devCode }) };
  }

  @Post('login/passenger')
  async loginPassenger(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    const { token, profile } = await this.auth.loginPassenger(body, ip, authorization, cookie);
    setSessionCookie(response, token);
    return { profile };
  }

  @Post('login/driver')
  async loginDriver(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    const { token, profile } = await this.auth.loginDriver(body, ip, authorization, cookie);
    setSessionCookie(response, token);
    return { profile };
  }

  @Post('login/control')
  async loginControl(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    const { token, profile } = await this.auth.loginControl(body, ip, authorization, cookie);
    setSessionCookie(response, token);
    return { profile };
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.auth.resolve(authorization);
  }

  @Post('refresh')
  refresh(
    @Res({ passthrough: true }) response: Response,
    @Headers('authorization') authorization?: string,
  ) {
    const { token, profile } = this.auth.refresh(authorization);
    setSessionCookie(response, token);
    return { profile };
  }

  @Post('logout')
  logout(
    @Res({ passthrough: true }) response: Response,
    @Headers('authorization') authorization?: string,
  ) {
    setSessionCookie(response);
    return this.auth.logout(authorization);
  }

  @Get('sessions')
  sessions(@Headers('authorization') authorization?: string) {
    return this.auth.sessions(authorization);
  }

  @Delete('sessions/:id')
  revoke(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.auth.revokeSession(id, authorization);
  }

  @Post('recovery/request')
  recoveryRequest(@Body() body: unknown) {
    return this.auth.recoveryRequest(body);
  }

  @Post('recovery/confirm')
  recoveryConfirm(@Body() body: unknown) {
    return this.auth.recoveryConfirm(body);
  }
}

@Controller('api/profile')
export class ProfileController {
  constructor(private readonly auth: AuthService) {}

  @Patch()
  update(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.auth.updateProfile(body, authorization);
  }

  @Post('password')
  password(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.auth.changePassword(body, authorization);
  }
}
