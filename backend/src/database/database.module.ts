import { Controller, Get, Global, Module, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Controller('api/health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get('db')
  async database() {
    try {
      await Promise.all(this.db.all.map((db) => db.ping()));
      return { db: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Base de datos no disponible.');
    }
  }
}

@Global()
@Module({
  controllers: [HealthController],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
