import { describe, it, expect } from 'vitest';
import { safeReturnTo } from './safe-return-to';

describe('safeReturnTo', () => {
  it('keeps in-app paths, query strings included', () => {
    expect(safeReturnTo('/dashboard')).toBe('/dashboard');
    expect(safeReturnTo('/oauth/authorize?client_id=a&state=b')).toBe('/oauth/authorize?client_id=a&state=b');
  });

  it.each([
    ['https://evil.example.com'],
    ['//evil.example.com'],
    ['/\\evil.example.com'],
    ['javascript:alert(1)'],
    ['dashboard'],
    ['/a\nb'],
    [''],
  ])('refuses %j', (value) => {
    expect(safeReturnTo(value)).toBeNull();
  });

  it('treats null and undefined as absent', () => {
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo(undefined)).toBeNull();
  });
});
