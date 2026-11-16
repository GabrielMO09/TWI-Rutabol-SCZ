import { Module } from '@nestjs/common';
import { MemoryModule } from '../micros/memory.module';
import { AuthController, ProfileController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [MemoryModule],
  controllers: [AuthController, ProfileController],
  providers: [AuthService, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
