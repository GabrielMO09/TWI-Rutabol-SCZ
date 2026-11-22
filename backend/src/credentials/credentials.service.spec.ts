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

  it('rechaza cambios en el contenido firmado y acepta la credencial original', () => {
    const issued = context.credentials.issue('7654321');
    const [encoded, signature] = issued.token.split('.');
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as
      Record<string, unknown>;
    const forged = Buffer.from(JSON.stringify({ ...payload, e: issued.expiresAt + 1 }))
      .toString('base64url');
    expect(context.credentials.verify({ token: `${forged}.${signature}` })).toEqual({
      valid: false, reason: 'Firma inválida.',
    });
    expect(context.credentials.verify({ token: issued.token })).toMatchObject({
      valid: true, fareCategory: 'general', codeMasked: '****4321',
    });
  });

  it('incluye solo el nonce y el vencimiento al decodificar el QR', () => {
    const userId = 'rude80480123';
    const code = 'RUDE80480123';
    expect(context.memory.users.get(userId)?.profile.code).toBe(code);

    const issued = context.credentials.issue(userId);
    const [encoded] = issued.token.split('.');
    const decoded = Buffer.from(encoded, 'base64url').toString('utf8');

    expect(decoded).not.toContain(userId);
    expect(decoded).not.toContain(code);
    expect(JSON.parse(decoded)).toEqual({
      n: expect.stringMatching(/^[A-Za-z0-9_-]{32}$/),
      e: issued.expiresAt,
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
