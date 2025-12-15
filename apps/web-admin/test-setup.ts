// Test setup for web-admin application
import 'reflect-metadata';
import '@testing-library/jest-dom';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Global test timeout
jest.setTimeout(15000);
