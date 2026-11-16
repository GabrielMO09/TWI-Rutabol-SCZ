import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { MicrosService } from './micros.service';

@Controller('api/micros')
export class MicrosController {
  constructor(private readonly micros: MicrosService) {}

  @Get()
  listMicros() {
    return this.micros.listMicros();
  }

  @Get(':id')
  findMicroById(@Param('id') id: string) {
    return this.micros.findMicroById(id);
  }

  @Post(':id/disembark')
  disembark(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.disembark(id, authorization);
  }

  @Patch(':id/max')
  setMax(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.setMax(id, body, authorization);
  }

  @Post(':id/emergency')
  emergency(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.emergency(id, authorization);
  }

  @Post(':id/emergency/resolve')
  resolveEmergency(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.resolveEmergency(id, authorization);
  }

  @Post(':id/emergency/transfer')
  emergencyTransfer(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.emergencyTransfer(id, body, authorization);
  }

  @Post(':id/rest-transfer')
  restTransfer(
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.restTransfer(id, body, authorization);
  }

  @Post(':id/resume')
  resume(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.micros.resume(id, authorization);
  }
}
