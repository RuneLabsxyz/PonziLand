import { describe, expect, it } from 'vitest';
import { getEnumVariant, fromDojoLevel, type Level } from './level';

describe('getEnumVariant', () => {
  it('should return string level directly', () => {
    expect(getEnumVariant('Zero' as any)).toBe('Zero');
    expect(getEnumVariant('First' as any)).toBe('First');
    expect(getEnumVariant('Second' as any)).toBe('Second');
  });

  it('should convert numeric level 1 to Zero', () => {
    expect(getEnumVariant(1 as any)).toBe('Zero');
  });

  it('should convert numeric level 2 to First', () => {
    expect(getEnumVariant(2 as any)).toBe('First');
  });

  it('should convert numeric level 3 to Second', () => {
    expect(getEnumVariant(3 as any)).toBe('Second');
  });

  it('should default to Zero for unknown numeric levels', () => {
    expect(getEnumVariant(99 as any)).toBe('Zero');
    expect(getEnumVariant(0 as any)).toBe('Zero');
  });

  it('should extract activeVariant from object', () => {
    expect(getEnumVariant({ activeVariant: 'First' } as any)).toBe('First');
    expect(getEnumVariant({ activeVariant: 'Second' } as any)).toBe('Second');
  });

  it('should fallback to first non-undefined key for objects without activeVariant', () => {
    expect(getEnumVariant({ Zero: 'value', First: undefined } as any)).toBe(
      'Zero',
    );
    expect(getEnumVariant({ First: 'value', Zero: undefined } as any)).toBe(
      'First',
    );
  });

  it('should return Zero for empty object without activeVariant', () => {
    expect(getEnumVariant({} as any)).toBe('Zero');
  });

  it('should return Zero for null/undefined input', () => {
    expect(getEnumVariant(null as any)).toBe('Zero');
    expect(getEnumVariant(undefined as any)).toBe('Zero');
  });
});

describe('fromDojoLevel', () => {
  it('should convert Zero to level 1', () => {
    expect(fromDojoLevel('Zero' as any)).toBe(1);
  });

  it('should convert First to level 2', () => {
    expect(fromDojoLevel('First' as any)).toBe(2);
  });

  it('should convert Second to level 3', () => {
    expect(fromDojoLevel('Second' as any)).toBe(3);
  });

  it('should default to level 1 for unknown variants', () => {
    expect(fromDojoLevel('Unknown' as any)).toBe(1);
  });

  it('should work with activeVariant objects', () => {
    expect(fromDojoLevel({ activeVariant: 'Zero' } as any)).toBe(1);
    expect(fromDojoLevel({ activeVariant: 'First' } as any)).toBe(2);
    expect(fromDojoLevel({ activeVariant: 'Second' } as any)).toBe(3);
  });

  it('should work with numeric inputs', () => {
    expect(fromDojoLevel(1 as any)).toBe(1); // 1 -> 'Zero' -> 1
    expect(fromDojoLevel(2 as any)).toBe(2); // 2 -> 'First' -> 2
    expect(fromDojoLevel(3 as any)).toBe(3); // 3 -> 'Second' -> 3
  });

  it('should return valid Level type values', () => {
    const result: Level = fromDojoLevel('First' as any);
    expect([1, 2, 3]).toContain(result);
  });
});
