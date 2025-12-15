/**
 * Smoke tests to verify basic testing infrastructure
 */

describe('Testing Infrastructure Smoke Tests', () => {
  it('should be able to run Jest tests', () => {
    expect(true).toBe(true);
  });

  it('should have access to Node.js APIs', () => {
    expect(process).toBeDefined();
    expect(process.env).toBeDefined();
  });

  it('should be able to import TypeScript modules', () => {
    const fs = require('fs');
    const path = require('path');

    expect(fs).toBeDefined();
    expect(path).toBeDefined();
  });

  it('should have proper test environment setup', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  describe('File System Access', () => {
    it('should be able to read files', () => {
      const fs = require('fs');
      const path = require('path');

      const packageJsonPath = path.join(process.cwd(), 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
    });

    it('should be able to check directory structure', () => {
      const fs = require('fs');
      const path = require('path');

      const appsDir = path.join(process.cwd(), 'apps');
      const libsDir = path.join(process.cwd(), 'libs');

      expect(fs.existsSync(appsDir)).toBe(true);
      expect(fs.existsSync(libsDir)).toBe(true);
    });
  });

  describe('Test Utilities', () => {
    it('should have Jest matchers available', () => {
      expect(expect).toBeDefined();
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(beforeEach).toBeDefined();
      expect(afterEach).toBeDefined();
    });

    it('should support async tests', async () => {
      const promise = Promise.resolve('test');
      await expect(promise).resolves.toBe('test');
    });

    it('should support test mocking', () => {
      const mockFn = jest.fn();
      mockFn('test');

      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
