import {
  Body, Controller, Get, Param, Patch, Post, Query, Req, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/roles.guard';
import type { AuthRequest } from '../auth/roles.guard';
import { ClaimsService } from '../claims/claims.service';
import { OpsService } from '../ops/ops.service';
import { ControlService } from './control.service';
import { paginate } from "../shared/pagination";
import { ReportsService } from './reports.service';

@Controller('api/control')
@Roles('control')
export class ControlManagementController {
  constructor(
    private readonly control: ControlService,
    private readonly claims: ClaimsService,
    private readonly ops: OpsService,
    private readonly reports: ReportsService,
  ) {}

  @Get('overview')
  overview() {
    return this.control.overview();
  }

  @Get('users')
  users(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    return paginate(this.control.users(), limit, offset);
  }

  @Post('users/:id/status')
  userStatus(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.control.setUserStatus(request.profile, id, body);
  }

  @Get('claims')
  allClaims(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    return paginate(this.claims.list(), limit, offset);
  }

  @Post('claims/:id')
  updateClaim(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.claims.update(request.profile, id, body);
  }

  @Get('incidents')
  incidents(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    return paginate(this.ops.incidents(), limit, offset);
  }

  @Patch('incidents/:id')
  incident(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.ops.updateIncident(request.profile, id, body);
  }

  @Get('lines')
  lines() {
    return this.control.lines();
  }

  @Post('lines')
  createLine(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.control.createLine(request.profile, body);
  }

  @Patch('lines/:id')
  updateLine(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.control.updateLine(request.profile, id, body);
  }

  @Get('buses')
  buses() {
    return this.control.buses();
  }

  @Post('buses')
  createBus(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.control.createBus(request.profile, body);
  }

  @Patch('buses/:id')
  updateBus(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.control.updateBus(request.profile, id, body);
  }

  @Get('drivers')
  drivers() {
    return this.control.drivers();
  }

  @Post('drivers')
  createDriver(@Req() request: AuthRequest, @Body() body: unknown) {
    return this.control.createDriver(request.profile, body);
  }

  @Patch('drivers/:id')
  updateDriver(@Req() request: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    return this.control.updateDriver(request.profile, id, body);
  }

  @Get('reports')
  report(
    @Query() query: Record<string, unknown>,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = this.reports.report(query);
    if (result.format === 'csv') {
      response.setHeader('Content-Type', 'text/csv; charset=utf-8');
      response.setHeader('Content-Disposition', 'attachment; filename="rutabol-reportes.csv"');
    }
    return result.data;
  }
}
