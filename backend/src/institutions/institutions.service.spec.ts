import { fixture } from '../test-support';
import { PublicInstitutionsController } from './institutions.controller';

describe('InstitutionsService', () => {
  let context: ReturnType<typeof fixture>;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
  });

  afterEach(() => context.close());

  it('muestra las deshabilitadas a Control, publica solo las habilitadas y audita los cambios', async () => {
    const actor = context.accreditation.profile('control@rutabol.bo');
    const publicController = new PublicInstitutionsController(context.institutions);
    const item = await context.institutions.create(actor, {
      type: 'universidad',
      name: 'Universidad de prueba',
      address: 'Av. Principal',
      emailDomain: '@PRUEBA.EDU.BO',
      enabled: false,
    });
    expect(context.institutions.list()).toContainEqual(item);
    expect(publicController.list().some(({ id }) => id === item.id)).toBe(false);
    expect(() => context.institutions.resolve(item.id, 'universidad')).toThrow('habilitada');

    const updated = await context.institutions.update(actor, { id: item.id, enabled: true });
    expect(updated).toMatchObject({ address: 'Av. Principal', emailDomain: 'prueba.edu.bo' });
    expect(publicController.list()).toContainEqual({
      id: item.id, type: 'universidad', name: item.name,
    });
    expect(context.institutions.resolve(item.name, 'universidad')).toEqual(updated);
    expect(context.memory.audit.slice(-2).map(({ action, target, result }) => ({
      action, target, result,
    }))).toEqual([
      { action: 'institucion.crear', target: item.id, result: 'ok' },
      { action: 'institucion.editar', target: item.id, result: 'ok' },
    ]);
  });

  it('rechaza nombres duplicados del mismo tipo, coincidencias parciales y dominios inválidos', async () => {
    const actor = context.accreditation.profile('control@rutabol.bo');
    const body = { type: 'colegio', name: 'Unidad Educativa Nueva' };
    await context.institutions.create(actor, body);
    await expect(context.institutions.create(actor, body)).rejects.toMatchObject({ status: 409 });
    expect(() => context.institutions.resolve('Unidad Educativa Nue', 'colegio')).toThrow();
    await expect(context.institutions.create(actor, {
      type: 'universidad', name: 'Universidad de prueba', emailDomain: 'https://prueba.edu.bo',
    })).rejects.toMatchObject({ status: 400 });
    await expect(context.institutions.create(actor, {
      type: 'universidad', name: 'Universidad sin dominio',
    })).rejects.toMatchObject({ status: 400 });
  });
});
