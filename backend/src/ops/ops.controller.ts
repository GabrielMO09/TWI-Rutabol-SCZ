import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { Roles } from '../auth/roles.guard';
import { OpsService } from './ops.service';

@Controller('api')
@Roles('chofer')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Post('jornada/start')
  start(@Headers('authorization') authorization?: string) {
    return this.ops.setJornada(true, authorization);
  }

  @Post('jornada/end')
  end(@Headers('authorization') authorization?: string) {
    return this.ops.setJornada(false, authorization);
  }

  @Get('jornada/me')
  jornada(@Headers('authorization') authorization?: string) {
    return this.ops.jornada(authorization);
  }

  @Get('driver/state')
  state(@Headers('authorization') authorization?: string) {
    return this.ops.state(authorization);
  }

  @Post('micros/:id/location')
  location(
    @Param('id') id: string, @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ops.location(id, body, authorization);
  }

  @Post('micros/:id/occupancy/correct')
  correct(
    @Param('id') id: string, @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ops.correct(id, body, authorization);
  }

  @Post('micros/:id/cash')
  cash(
    @Param('id') id: string, @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ops.cash(id, body, authorization);
  }

  @Post('incidents')
  incident(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ops.reportIncident(body, authorization);
  }

  @Post('passes/redeem')
  redeem(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.ops.redeem(body, authorization);
  }
}
