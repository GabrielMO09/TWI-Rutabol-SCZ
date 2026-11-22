import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { MemoryModule } from './micros/memory.module';
import { CredentialsService } from './credentials/credentials.service';
import { PublicService } from './public/public.service';
import {
  ControlController, CredentialsController, PassengerController, PublicController,
} from './rutabol.controller';
import { OpsService } from './ops/ops.service';
import { OpsController } from './ops/ops.controller';
import { ClaimsService } from './claims/claims.service';
import { ClaimsController } from './claims/claims.controller';
import { ControlService } from './control/control.service';
import { ReportsService } from './control/reports.service';
import { ControlManagementController } from './control/control.controller';
import { DocsController } from './docs';
import {
  ControlInstitutionsController, PublicInstitutionsController,
} from './institutions/institutions.controller';
import { ControlStopsController, PublicStopsController } from './stops/stops.controller';
import { StopsService } from './stops/stops.service';

@Module({
  imports: [MemoryModule, AuthModule],
  controllers: [
    PublicController, PassengerController, CredentialsController, ControlController,
    OpsController, ClaimsController, ControlManagementController, DocsController,
    ControlInstitutionsController, PublicInstitutionsController,
    ControlStopsController, PublicStopsController,
  ],
  providers: [
    CredentialsService, PublicService, OpsService, ClaimsService, ControlService, ReportsService,
    StopsService,
  ],
  exports: [
    CredentialsService, PublicService, OpsService, ClaimsService, ControlService, ReportsService,
  ],
})
export class RutabolModule {}
