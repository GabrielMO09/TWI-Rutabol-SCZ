import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MemoryModule } from '../micros/memory.module';
import { PersistInterceptor, PersistenceService } from './persistence.service';

@Module({
  imports: [MemoryModule],
  providers: [PersistenceService, { provide: APP_INTERCEPTOR, useClass: PersistInterceptor }],
  exports: [PersistenceService],
})
export class PersistenceModule {}
