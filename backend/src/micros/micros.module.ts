import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MemoryModule } from './memory.module';
import { MicrosController } from './micros.controller';
import { MicrosService } from './micros.service';
import { WorldController } from './world.controller';
import { PublicService } from '../public/public.service';

@Module({
  imports: [MemoryModule, AuthModule],
  controllers: [MicrosController, WorldController],
  providers: [MicrosService, PublicService],
  exports: [MicrosService],
})
export class MicrosModule {}
