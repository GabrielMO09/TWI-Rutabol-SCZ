import { fixture } from '../test-support';
import type { Profile } from '../micros/models';

describe('Acreditación y tarifas', () => {
  let context: ReturnType<typeof fixture>;
  let actor: Profile;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
    actor = context.accreditation.profile('control@rutabol.bo');
  });

  afterEach(() => {
    context.close();
    jest.restoreAllMocks();
  });

  it('exige correo confirmado antes de aprobar y aplica vigencia de 180 días', () => {
    const userId = 'lucia.vaca@upds.edu.bo';
    const request = context.accreditation.request(userId, {
      institution: 'UPDS', code: userId, institutionalCode: 'MAT-101',
    });
    expect(context.accreditation.profile(userId).fareCategory).toBe('general');
    expect(() => context.accreditation.decision(actor, request.accreditation.id, {
      status: 'aprobada',
    })).toThrow('Primero debe confirmarse el correo institucional.');
    context.accreditation.confirmEmail(userId, { code: request.devCode });
    const result = context.accreditation.decision(actor, request.accreditation.id, {
      status: 'aprobada',
    });
    expect(context.accreditation.profile(userId).fareCategory).toBe('universitario');
    expect(context.memory.notifications.get(userId)).toHaveLength(1);
    expect(context.memory.audit.map((item) => item.result)).toEqual(['error', 'ok']);
    jest.spyOn(Date, 'now').mockReturnValue(result.validUntil!);
    expect(context.accreditation.get(userId)?.status).toBe('vencida');
    expect(context.accreditation.profile(userId).fareCategory).toBe('general');
  });

  it('observada y rechazada siempre pagan tarifa general', () => {
    const userId = 'estudiante@upds.edu.bo';
    const id = context.accreditation.get(userId)!.id;
    for (const status of ['observada', 'rechazada']) {
      context.accreditation.decision(actor, id, { status, note: 'Revisar documento.' });
      expect(context.accreditation.profile(userId).fareCategory).toBe('general');
    }
  });

  it('rechaza códigos duplicados de otro usuario', () => {
    expect(() => context.accreditation.request('lucia.vaca@upds.edu.bo', {
      institution: 'UPDS', code: 'ESTUDIANTE@upds.edu.bo', institutionalCode: 'MAT-101',
    })).toThrow('Ya existe una cuenta con esos datos de identificación.');
  });

  it('usa el dominio de la institución elegida y rechaza subdominios', async () => {
    const item = await context.institutions.create(actor, {
      name: 'Universidad de prueba', type: 'universidad', emailDomain: 'prueba.edu.bo',
    });
    const userId = 'lucia.vaca@upds.edu.bo';
    const input = { institution: item.id, institutionalCode: 'MAT-101' };
    expect(() => context.accreditation.request(userId, { ...input, code: userId }))
      .toThrow('Usa tu correo institucional @prueba.edu.bo.');
    expect(() => context.accreditation.request(userId, { ...input, code: 'lucia@mail.prueba.edu.bo' }))
      .toThrow('Usa tu correo institucional @prueba.edu.bo.');
    expect(context.accreditation.request(userId, { ...input, code: 'lucia@prueba.edu.bo' }).accreditation)
      .toMatchObject({ institutionId: item.id, code: 'lucia@prueba.edu.bo', emailVerified: false });
  });

  it('actualiza tarifas e historial sin mutar entradas anteriores', () => {
    const previous = context.fares.current();
    const next = context.fares.update(actor, {
      general: 4, universitario: 1.2, reason: 'Actualización municipal.',
    });
    expect(next.general).toBe(4);
    expect(context.fares.history().history[0]).toEqual(previous);
    expect(context.fares.history().history).toHaveLength(2);
    expect(() => context.fares.update(actor, {
      escolar: 0, reason: 'Valor incorrecto.',
    })).toThrow();
    expect(context.fares.history().history).toHaveLength(2);
  });
});
