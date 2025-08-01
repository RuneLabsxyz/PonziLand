import { describe, it, expect } from 'vitest';
import * as exports from '../index';

describe('Simple Library Tests', () => {
  it('exports Button component', () => {
    expect(exports.Button).toBeDefined();
    // Button is a Svelte component, which is compiled to a string in the dist
    expect(typeof exports.Button).toBeTruthy();
  });

  it('exports all Card components', () => {
    expect(exports.Card).toBeDefined();
    expect(exports.CardHeader).toBeDefined();
    expect(exports.CardTitle).toBeDefined();
    expect(exports.CardDescription).toBeDefined();
    expect(exports.CardContent).toBeDefined();
    expect(exports.CardFooter).toBeDefined();
  });

  it('exports utility functions', () => {
    expect(exports.cn).toBeDefined();
    expect(typeof exports.cn).toBe('function');
    expect(exports.flyAndScale).toBeDefined();
    expect(typeof exports.flyAndScale).toBe('function');
  });

  it('cn utility works correctly', () => {
    // Test basic class name concatenation
    expect(exports.cn('class1', 'class2')).toBe('class1 class2');

    // Test with undefined/null values
    expect(exports.cn('class1', undefined, 'class2')).toBe('class1 class2');

    // Test with conditional classes
    expect(exports.cn('base', false && 'conditional', 'other')).toBe('base other');
  });

  it('exports buttonVariants', () => {
    expect(exports.buttonVariants).toBeDefined();
    expect(typeof exports.buttonVariants).toBe('function');

    // Test variant function
    const blueDefault = exports.buttonVariants({ variant: 'blue', size: 'default' });
    expect(blueDefault).toContain('button-ponzi-blue');
    expect(blueDefault).toContain('stroke-3d-blue');
  });
});
