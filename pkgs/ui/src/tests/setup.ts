import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';

// Mock window and document for client-side testing
global.window = window;
global.document = document;

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';
