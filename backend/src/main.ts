import './env';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { InputPipe } from './shared/input.pipe';
import { sessionCookieAuthorization } from './shared/session-cookie';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule, ObserveInstrument } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    instrument: ObserveInstrument,
  });
  // Tras un proxy HTTPS (RNF-04): TRUST_PROXY=1 (nº de saltos) o una lista de IP/CIDR del proxy.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
  }
  // La API la consume el frontend desde otro origen: sin esto Firefox y Safari bloquean las respuestas (CORP same-origin).
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(sessionCookieAuthorization);
  app.useGlobalPipes(new InputPipe());
  app.useBodyParser('json', { limit: '5mb' });
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
