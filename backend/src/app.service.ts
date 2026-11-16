import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
// crear endpoint
// metodo : GET endpoint: /api/micros funcion:ListaMicros
// metodo : GET endpoint: /api/micros/1 funcion:Buscar por id
// metodo : POST endpoint: /api/micros funcion:RegistrarMicros
