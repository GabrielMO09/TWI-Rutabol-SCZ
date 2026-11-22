import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './shared/all-exceptions.filter';
import { createObserveModule } from '@nestjs/observe';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database/database.module';
import { PersistenceModule } from './persistence/persistence.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MicrosModule } from './micros/micros.module';
import { RutabolModule } from './rutabol.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ...(process.env.OBSERVE_APP_KEY && process.env.OBSERVE_APP_SECRET
      ? [
          ObserveModule.forRoot({
            appKey: process.env.OBSERVE_APP_KEY,
            appSecret: process.env.OBSERVE_APP_SECRET,
            serviceId: 'backend',
          }),
        ]
      : []),
    // RNF-04: tope general por IP (el login tiene además su propio limitador). Holgado: el frontend sondea el mundo.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    DatabaseModule,
    PersistenceModule,
    AuthModule,
    MicrosModule,
    RutabolModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
