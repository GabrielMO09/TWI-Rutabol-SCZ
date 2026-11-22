import { BadRequestException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function run(error: unknown) {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = { switchToHttp: () => ({ getResponse: () => ({ status }) }) } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(error, host);
  return { status, json };
}

describe('AllExceptionsFilter', () => {
  it('conserva las HttpException', () => {
    const { status, json } = run(new BadRequestException('mal'));
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ message: 'mal' }));
  });

  it('no filtra el mensaje del parser JSON', () => {
    const { status, json } = run(new BadRequestException('Expected property name at position 1', { cause: { type: 'entity.parse.failed' } }));
    expect(status).toHaveBeenCalledWith(400);
    expect(JSON.stringify(json.mock.calls)).not.toContain('position');
  });

  it('oculta el detalle de errores inesperados', () => {
    const { status, json } = run(new Error('password=secreto en SQL'));
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(json.mock.calls)).not.toContain('secreto');
  });
});
