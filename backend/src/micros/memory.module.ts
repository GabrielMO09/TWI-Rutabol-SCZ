import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { EventsService } from '../shared/events.service';
import { AuditService } from '../shared/audit.service';
import { NotificationsService } from '../shared/notifications.service';
import { FaresService } from '../shared/fares.service';
import { StopsStore } from '../stops/stops.store';
import { InstitutionsService } from '../institutions/institutions.service';
import { InstitutionsStore } from '../institutions/institutions.store';
import { AccreditationService } from '../shared/accreditation.service';
import { WalletService } from '../shared/wallet.service';

const services = [
  EventsService,
  MemoryService,
  AuditService,
  NotificationsService,
  FaresService,
  InstitutionsStore,
  StopsStore,
  InstitutionsService,
  AccreditationService,
  WalletService,
];

@Module({
  providers: services,
  exports: services,
})
export class MemoryModule {}
