import { createHmac } from 'node:crypto';
import { fixture } from '../test-support';

describe('Credenciales QR', () => {
  let context: ReturnType<typeof fixture>;

  beforeEach(async () => {
    context = fixture();
    await context.ready;
  });

  afterEach(() => {
    context.close();
    jest.restoreAllMocks();
  });

  it('firma el contenido y no incluye el identificador en claro en el payload', () => {
    const issued = context.credentials.issue('7654321');
    const [encoded, signature] = issued.token.split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as
      Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['e', 'n', 'u']);
    expect(payload).not.toHaveProperty('code');
    expect(payload).not.toHaveProperty('email');
    const forged = Buffer.from(JSON.stringify({ ...payload, u: 'otro' })).toString('base64url');
    expect(context.credentials.verify({ token: `${forged}.${signature}` })).toEqual({
      valid: false, reason: 'Firma inválida.',
    });
    expect(context.credentials.verify({ token: issued.token })).toMatchObject({
      valid: true, fareCategory: 'general', codeMasked: '****4321',
    });
  });

  it('rechaza un nonce ya utilizado', () => {
    const issued = context.credentials.issue('estudiante@upds.edu.bo');
    expect(context.credentials.verify({ token: issued.token })).toMatchObject({ valid: true });
    expect(context.credentials.verify({ token: issued.token })).toEqual({
      valid: false, reason: 'Código ya utilizado',
    });
  });

  it('rechaza expiración exacta a los sesenta segundos', () => {
    const issued = context.credentials.issue('7654321');
    jest.spyOn(Date, 'now').mockReturnValue(issued.expiresAt);
    expect(context.credentials.verify({ token: issued.token })).toEqual({
      valid: false, reason: 'Código expirado.',
    });
  });

  it('usa CREDENTIAL_SECRET cuando está definido', async () => {
    const previous = process.env.CREDENTIAL_SECRET;
    process.env.CREDENTIAL_SECRET = 'secreto-de-prueba';
    let configured: ReturnType<typeof fixture> | undefined;
    try {
      configured = fixture();
      await configured.ready;
      const issued = configured.credentials.issue('7654321');
      const [payload, signature] = issued.token.split('.');
      expect(signature).toBe(
        createHmac('sha256', 'secreto-de-prueba').update(payload).digest('base64url'),
      );
    } finally {
      configured?.close();
      if (previous === undefined) delete process.env.CREDENTIAL_SECRET;
      else process.env.CREDENTIAL_SECRET = previous;
    }
  });
});
