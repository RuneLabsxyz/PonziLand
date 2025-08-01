import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

describe('Build Output Tests', () => {
  const distPath = resolve(__dirname, '../../dist');

  it('dist folder exists', () => {
    expect(existsSync(distPath)).toBe(true);
  });

  it('index.js is built', () => {
    const indexPath = resolve(distPath, 'index.js');
    expect(existsSync(indexPath)).toBe(true);
  });

  it('index.d.ts is generated', () => {
    const typesPath = resolve(distPath, 'index.d.ts');
    expect(existsSync(typesPath)).toBe(true);
  });

  it('exports are properly defined in index.d.ts', () => {
    const typesPath = resolve(distPath, 'index.d.ts');
    const content = readFileSync(typesPath, 'utf-8');

    // Check for main exports
    expect(content).toContain('export { default as Button }');
    expect(content).toContain('export { default as Card }');
    expect(content).toContain('export { cn');
    // buttonVariants is exported via export * from button/index.js
    expect(content).toContain("export * from './components/button/index.js'");
  });

  it('source map is generated', () => {
    const mapPath = resolve(distPath, 'index.js.map');
    expect(existsSync(mapPath)).toBe(true);
  });
});
