import { Module } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { EventsService } from '../shared/events.service';
import { AuditService } from '../shared/audit.service';
import { NotificationsService } from '../shared/notifications.service';
import { FaresService } from '../shared/fares.service';
import { AccreditationService } from '../shared/accreditation.service';
import { WalletService } from '../shared/wallet.service';

const services = [
  EventsService,
  MemoryService,
  AuditService,
  NotificationsService,
  FaresService,
  AccreditationService,
  WalletService,
];

@Module({
  providers: services,
  exports: services,
})
export class MemoryModule {}
