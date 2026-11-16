import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.auth.register(body);
  }

  @Post('login/passenger')
  loginPassenger(@Body() body: unknown) {
    return this.auth.loginPassenger(body);
  }

  @Post('login/driver')
  loginDriver(@Body() body: unknown) {
    return this.auth.loginDriver(body);
  }

  @Post('login/control')
  loginControl(@Body() body: unknown) {
    return this.auth.loginControl(body);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.auth.resolve(authorization);
  }

  @Post('refresh')
  refresh(@Headers('authorization') authorization?: string) {
    return this.auth.refresh(authorization);
  }

  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
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
