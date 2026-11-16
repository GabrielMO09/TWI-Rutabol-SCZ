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

@Module({
  imports: [MemoryModule, AuthModule],
  controllers: [
    PublicController, PassengerController, CredentialsController, ControlController,
    OpsController, ClaimsController, ControlManagementController, DocsController,
  ],
  providers: [
    CredentialsService, PublicService, OpsService, ClaimsService, ControlService, ReportsService,
  ],
  exports: [
    CredentialsService, PublicService, OpsService, ClaimsService, ControlService, ReportsService,
  ],
})
export class RutabolModule {}
