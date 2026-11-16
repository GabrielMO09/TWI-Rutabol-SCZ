import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
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
    AuthModule,
    MicrosModule,
    RutabolModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
