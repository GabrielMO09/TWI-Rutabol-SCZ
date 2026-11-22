import { BadRequestException } from '@nestjs/common';
import { paginate } from './pagination';

const items = [1, 2, 3, 4, 5];

describe('paginate', () => {
  it('sin parámetros devuelve todo', () => expect(paginate(items)).toBe(items));
  it('corta por limit y offset', () => expect(paginate(items, '2', '1')).toEqual([2, 3]));
  it('solo offset', () => expect(paginate(items, undefined, '3')).toEqual([4, 5]));
  it.each([['0', undefined], ['501', undefined], ['x', undefined], [undefined, '-1'], ['1.5', undefined]])(
    'rechaza limit=%s offset=%s',
    (limit, offset) => expect(() => paginate(items, limit, offset)).toThrow(BadRequestException),
  );
});
