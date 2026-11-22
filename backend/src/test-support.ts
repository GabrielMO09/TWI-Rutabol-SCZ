import { MemoryService } from './micros/memory.service';
import { EventsService } from './shared/events.service';
import { AuditService } from './shared/audit.service';
import { NotificationsService } from './shared/notifications.service';
import { FaresService } from './shared/fares.service';
import { AccreditationService } from './shared/accreditation.service';
import { WalletService } from './shared/wallet.service';
import { AuthService } from './auth/auth.service';
import { InstitutionsService } from './institutions/institutions.service';
import { InstitutionsStore } from './institutions/institutions.store';
import { CredentialsService } from './credentials/credentials.service';
import { PublicService } from './public/public.service';
import { MicrosService } from './micros/micros.service';
import { OpsService } from './ops/ops.service';
import { ClaimsService } from './claims/claims.service';
import { ControlService } from './control/control.service';
import { ReportsService } from './control/reports.service';

export function fixture() {
  const events = new EventsService();
  const memory = new MemoryService(events);
  const audit = new AuditService(memory);
  const notifications = new NotificationsService(memory);
  const fares = new FaresService(memory, audit);
  const institutionStore = new InstitutionsStore();
  const institutions = new InstitutionsService(institutionStore, audit, memory);
  const institutionReady = institutionStore.save({
    type: 'universidad', name: 'UPDS', address: null, emailDomain: 'upds.edu.bo', enabled: true,
  });
  const accreditation = new AccreditationService(memory, audit, notifications, institutions);
  const wallet = new WalletService(memory, audit, notifications);
  const auth = new AuthService(memory, accreditation, audit);
  const credentials = new CredentialsService(memory, accreditation);
  const publicService = new PublicService(memory);
  const micros = new MicrosService(
    memory, auth, fares, wallet, accreditation, notifications, publicService, audit,
  );
  const ops = new OpsService(memory, auth, audit, fares, notifications, credentials);
  const claims = new ClaimsService(memory, wallet, audit, notifications);
  const control = new ControlService(memory, accreditation, audit, notifications);
  const reports = new ReportsService(memory);
  return {
    events, memory, audit, notifications, fares, accreditation, wallet,
    institutions, auth, credentials, publicService, micros, ops, claims, control, reports,
    ready: Promise.all([
      institutionReady,
      ...[...memory.users.values()].map((user) => user.secret),
    ]),
    close() {
      wallet.onModuleDestroy();
      memory.onModuleDestroy();
      events.onModuleDestroy();
    },
  };
}
