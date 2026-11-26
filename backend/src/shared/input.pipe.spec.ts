import { BadRequestException } from '@nestjs/common';
import { InputPipe } from './input.pipe';

const pipe = new InputPipe();
const param = { type: 'param' } as const;
const query = { type: 'query' } as const;
const body = { type: 'body' } as const;

describe('InputPipe', () => {
  it('acepta ids normales', () => {
    for (const id of ['17-045', 'INC-000018', 'a1b2c3d4e5f60718']) {
      expect(pipe.transform(id, param)).toBe(id);
    }
    expect(pipe.transform({ line: '17', limit: '50' }, query)).toEqual({ line: '17', limit: '50' });
  });

  it('acepta ids de usuario que son un correo (suspender desde el Centro de Control)', () => {
    for (const id of ['lucia.vaca@upds.edu.bo', 'ana+scz@example.com', `${'a'.repeat(60)}@upds.edu.bo`]) {
      expect(pipe.transform(id, param)).toBe(id);
    }
    for (const id of [`${'a'.repeat(250)}@upds.edu.bo`, "a'--@upds.edu.bo", '../a@upds.edu.bo', 'a@b@c']) {
      expect(() => pipe.transform(id, param)).toThrow(BadRequestException);
    }
  });

  it('rechaza ids con SQL, rutas o longitud excesiva', () => {
    for (const id of ["' OR 1=1 --", '"; DROP TABLE rutabol.usuario;--', '../../etc/passwd', 'x'.repeat(65)]) {
      expect(() => pipe.transform(id, param)).toThrow(BadRequestException);
    }
  });

  it('rechaza consultas con arreglos u objetos', () => {
    expect(() => pipe.transform({ limit: ['1', '2'] }, query)).toThrow(BadRequestException);
    expect(() => pipe.transform({ line: { $ne: 1 } }, query)).toThrow(BadRequestException);
  });

  it('rechaza claves de contaminación de prototipos en el cuerpo', () => {
    expect(() => pipe.transform(JSON.parse('{"a":{"__proto__":{"x":1}}}'), body)).toThrow(BadRequestException);
    expect(() => pipe.transform({ constructor: {} }, body)).toThrow(BadRequestException);
    expect(pipe.transform({ name: "Robert'); DROP TABLE--" }, body)).toEqual({ name: "Robert'); DROP TABLE--" });
  });
});
