import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { DatabaseService } from '../database/database.service';
import type { Profile } from '../micros/models';
import { fixture } from '../test-support';
import { StopsService } from './stops.service';
import { StopsStore } from './stops.store';

describe('Paradas', () => {
  const actor: Profile = {
    userId: 'control-test',
    role: 'control',
    status: 'activo',
    name: 'Operador de pruebas',
  };
  let context: ReturnType<typeof fixture>;
  let store: StopsStore;
  let service: StopsService;

  const input = {
    line: '17',
    name: 'Plaza principal',
    reference: 'Frente al mercado',
    lat: -17.7834,
    lng: -63.1821,
    order: 2,
  };

  beforeEach(async () => {
    context = fixture();
    await context.ready;
    store = new StopsStore({} as DatabaseService);
    service = new StopsService(context.memory, context.audit, store);
  });

  afterEach(() => context.close());

  it('crea, edita parcialmente y elimina, con auditoría', () => {
    const created = service.create(actor, input);
    expect(created).toMatchObject({ ...input, active: true });
    expect(service.update(actor, created.id, { name: 'Parada central', order: 3 }))
      .toMatchObject({ id: created.id, name: 'Parada central', reference: input.reference, order: 3 });
    expect(service.remove(actor, created.id).id).toBe(created.id);
    expect(service.list()).toEqual([]);
    expect(context.memory.audit.slice(-3)).toEqual([
      expect.objectContaining({ action: 'parada.crear', target: created.id, result: 'ok' }),
      expect.objectContaining({ action: 'parada.actualizar', target: created.id, result: 'ok' }),
      expect.objectContaining({ action: 'parada.eliminar', target: created.id, result: 'ok' }),
    ]);
  });

  it('publica en orden únicamente las paradas activas de líneas activas', () => {
    const second = service.create(actor, input);
    const first = service.create(actor, { ...input, order: 1 });
    service.create(actor, { ...input, order: 3, active: false });
    const other = service.create(actor, { ...input, line: '44' });
    expect(service.publicList('17').map((stop) => stop.id)).toEqual([first.id, second.id]);
    expect(service.publicList()).toHaveLength(3);
    context.memory.lines.find((line) => line.id === other.line)!.active = false;
    expect(service.publicList('44')).toEqual([]);
    expect(service.publicList()).toHaveLength(2);
    expect(service.list()).toHaveLength(4);
  });

  it.each([
    [{ lat: -91 }],
    [{ lng: 181 }],
    [{ lat: '-17' }],
    [{ order: 0 }],
    [{ order: 1.5 }],
    [{ active: 'false' }],
    [{ name: ' ' }],
  ])('rechaza campos inválidos (%j) y audita el error', (patch) => {
    expect(() => service.create(actor, { ...input, ...patch })).toThrow(BadRequestException);
    expect(context.memory.audit.at(-1)).toMatchObject({ action: 'parada.crear', result: 'error' });
  });

  it('rechaza líneas y paradas inexistentes y órdenes duplicados al mover una parada', () => {
    expect(() => service.create(actor, { ...input, line: 'inexistente' })).toThrow(NotFoundException);
    expect(() => service.publicList('inexistente')).toThrow(NotFoundException);
    expect(() => service.remove(actor, 'inexistente')).toThrow(NotFoundException);
    service.create(actor, input);
    expect(() => service.create(actor, input)).toThrow(ConflictException);
    const other = service.create(actor, { ...input, line: '44' });
    expect(() => service.update(actor, other.id, { line: '17' })).toThrow(ConflictException);
    expect(service.publicList('44')).toEqual([other]);
  });

  it('hidrata los datos guardados y reintenta una escritura fallida', async () => {
    const saved = service.create(actor, input);
    const query = jest.fn().mockResolvedValue({ rows: [{ ...saved }] });
    const write = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: '12' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('escritura fallida'))
      .mockResolvedValue({ rows: [{ id: '12' }] });
    const tx = jest.fn((work: (client: { query: typeof write }) => Promise<void>) =>
      work({ query: write }));
    const restored = new StopsStore({ transport: { query, tx } } as unknown as DatabaseService);
    const restoredService = new StopsService(context.memory, context.audit, restored);

    await restored.hydrate();
    expect(restoredService.list()).toEqual([saved]);
    await restored.run();
    expect(tx).not.toHaveBeenCalled();

    restoredService.update(actor, saved.id, { active: false });
    await expect(restored.run()).rejects.toThrow('escritura fallida');
    await restored.run();
    expect(write.mock.calls.at(-1)?.[1]).toEqual([
      '12', [saved.id], [saved.name], [saved.reference], [saved.lat], [saved.lng], [saved.order], [false],
    ]);
    await restored.run();
    expect(tx).toHaveBeenCalledTimes(2);
  });
});
