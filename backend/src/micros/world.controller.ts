import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { MicrosService } from './micros.service';

@Controller('api')
export class WorldController {
  constructor(private readonly micros: MicrosService) {}

  @Get('world')
  world() {
    return this.micros.world();
  }

  @Post('tickets')
  createTicket(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.createTicket(body, authorization);
  }

  @Get('tickets/me')
  myTickets(@Headers('authorization') authorization?: string) {
    return this.micros.myTickets(authorization);
  }

  @Post('reqs/:id/decision')
  decide(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.decide(id, body, authorization);
  }

  @Delete('alerts/:id')
  deleteAlert(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.deleteAlert(id, authorization);
  }
}
