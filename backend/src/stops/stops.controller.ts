import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/roles.guard';
import type { AuthRequest } from '../auth/roles.guard';
import { StopsService } from './stops.service';

@Controller('api/control/stops')
@Roles('control')
export class ControlStopsController {
  constructor(private readonly stops: StopsService) {}

  @Get()
  list() {
    return this.stops.list();
  }

  @Post()
  create(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.stops.create(request.profile, body);
  }

  @Patch(':id')
  update(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.stops.update(request.profile, id, body);
  }

  @Delete(':id')
  remove(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.stops.remove(request.profile, id);
  }
}

@Controller('api/public/stops')
export class PublicStopsController {
  constructor(private readonly stops: StopsService) {}

  @Get()
  list(@Query('line') line?: unknown) {
    return this.stops.publicList(line);
  }
}
