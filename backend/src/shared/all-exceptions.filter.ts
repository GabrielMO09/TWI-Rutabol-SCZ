import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';

/** Errores inesperados: 500 genérico al cliente (sin stack ni detalles) y el detalle solo al log. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      // El parser de JSON de Express filtra su mensaje interno (posición, token); se reemplaza por uno genérico.
      if ((exception.cause as { type?: string } | undefined)?.type === 'entity.parse.failed') {
        response.status(400).json({ statusCode: 400, message: 'El cuerpo de la solicitud no es un JSON válido.' });
        return;
      }
      const body = exception.getResponse();
      // Igual que el manejador por defecto de Nest: un texto se envuelve en { statusCode, message }.
      response
        .status(exception.getStatus())
        .json(typeof body === 'string' ? { statusCode: exception.getStatus(), message: body } : body);
      return;
    }
    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor.',
    });
  }
}
