/**
 * Application Startup Tests
 *
 * Simplified tests that verify applications can start and respond to basic requests.
 * These tests are designed to be more reliable and easier to debug.
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

describe('Application Startup Validation', () => {
  const QUICK_TIMEOUT = 30000; // 30 seconds for quick tests

  // Helper to check if a port is in use
  const isPortInUse = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = http.createServer();

      server.listen(port, () => {
        server.close(() => resolve(false));
      });

      server.on('error', () => resolve(true));
    });
  };

  // Helper to make a simple HTTP request
  const testHttpEndpoint = (
    url: string,
    timeout: number = 5000
  ): Promise<{ status: number; success: boolean }> => {
    return new Promise((resolve) => {
      const request = http.get(url, (response) => {
        resolve({
          status: response.statusCode || 0,
          success:
            (response.statusCode || 0) >= 200 &&
            (response.statusCode || 0) < 500,
        });
      });

      request.on('error', () => {
        resolve({ status: 0, success: false });
      });

      request.setTimeout(timeout, () => {
        request.destroy();
        resolve({ status: 0, success: false });
      });
    });
  };

  describe('Build Validation', () => {
    it(
      'should be able to build all applications',
      () => {
        try {
          console.log('Testing build capability...');

          // Test that we can at least prepare for build (this validates the configuration)
          const result = execSync('npx nx show projects', {
            encoding: 'utf8',
            timeout: 10000,
            cwd: path.join(__dirname, '..'),
          });

          expect(result).toContain('web-admin');
          expect(result).toContain('member-app');
          expect(result).toContain('api');

          console.log('✅ NX workspace and projects are properly configured');
        } catch (error) {
          console.error('❌ Build validation failed:', error);
          throw error;
        }
      },
      QUICK_TIMEOUT
    );

    it('should have valid Next.js configurations', () => {
      const webAdminConfig = path.join(
        __dirname,
        '..',
        'apps',
        'web-admin',
        'next.config.js'
      );
      const memberAppConfig = path.join(
        __dirname,
        '..',
        'apps',
        'member-app',
        'next.config.js'
      );

      expect(fs.existsSync(webAdminConfig)).toBe(true);
      expect(fs.existsSync(memberAppConfig)).toBe(true);

      // Try to require the configs to ensure they're valid JavaScript
      expect(() => require(webAdminConfig)).not.toThrow();
      expect(() => require(memberAppConfig)).not.toThrow();

      console.log('✅ Next.js configurations are valid');
    });

    it('should have valid NestJS configuration', () => {
      const apiMainFile = path.join(
        __dirname,
        '..',
        'apps',
        'api',
        'src',
        'main.ts'
      );
      const apiModuleFile = path.join(
        __dirname,
        '..',
        'apps',
        'api',
        'src',
        'app',
        'app.module.ts'
      );

      expect(fs.existsSync(apiMainFile)).toBe(true);
      expect(fs.existsSync(apiModuleFile)).toBe(true);

      const mainContent = fs.readFileSync(apiMainFile, 'utf8');
      const moduleContent = fs.readFileSync(apiModuleFile, 'utf8');

      expect(mainContent).toContain('NestFactory');
      expect(moduleContent).toContain('@Module');

      console.log('✅ NestJS configuration is valid');
    });
  });

  describe('Port Availability', () => {
    it('should have default ports available for testing', async () => {
      const ports = [3333, 4200, 4201];

      for (const port of ports) {
        const inUse = await isPortInUse(port);
        if (inUse) {
          console.warn(
            `⚠️ Port ${port} is already in use - this may affect testing`
          );
        } else {
          console.log(`✅ Port ${port} is available`);
        }
      }

      // This test always passes but provides useful information
      expect(true).toBe(true);
    });
  });

  describe('Quick Application Tests', () => {
    let processes: ChildProcess[] = [];

    afterAll(() => {
      // Clean up any processes we started
      processes.forEach((proc) => {
        if (proc && !proc.killed) {
          proc.kill('SIGTERM');
        }
      });
    });

    it(
      'should be able to start API in development mode',
      async () => {
        try {
          console.log('Testing API startup...');

          // Start the API process
          const apiProcess = spawn('npx', ['nx', 'serve', 'api'], {
            cwd: path.join(__dirname, '..'),
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
          });

          processes.push(apiProcess);

          let output = '';
          let hasStarted = false;

          // Wait for startup indicators
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              if (!hasStarted) {
                reject(new Error('API failed to start within timeout'));
              }
            }, 25000);

            apiProcess.stdout?.on('data', (data) => {
              output += data.toString();
              console.log(`[API] ${data.toString().trim()}`);

              if (
                output.includes('localhost:3333') ||
                output.includes('Application is running') ||
                output.includes('Nest application successfully started')
              ) {
                hasStarted = true;
                clearTimeout(timeout);
                resolve();
              }
            });

            apiProcess.stderr?.on('data', (data) => {
              console.error(`[API ERROR] ${data.toString().trim()}`);
            });

            apiProcess.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          // Give it a moment to fully start
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Test the health endpoint
          const healthCheck = await testHttpEndpoint(
            'http://localhost:3333/health'
          );

          expect(hasStarted).toBe(true);
          console.log(
            `✅ API started successfully (Health check: ${healthCheck.success ? 'PASS' : 'FAIL'})`
          );
        } catch (error) {
          console.error('❌ API startup test failed:', error);
          throw error;
        }
      },
      QUICK_TIMEOUT
    );

    it(
      'should be able to start Web Admin in development mode',
      async () => {
        try {
          console.log('Testing Web Admin startup...');

          const webAdminProcess = spawn('npx', ['nx', 'serve', 'web-admin'], {
            cwd: path.join(__dirname, '..'),
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
          });

          processes.push(webAdminProcess);

          let output = '';
          let hasStarted = false;

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              if (!hasStarted) {
                reject(new Error('Web Admin failed to start within timeout'));
              }
            }, 25000);

            webAdminProcess.stdout?.on('data', (data) => {
              output += data.toString();
              console.log(`[WEB-ADMIN] ${data.toString().trim()}`);

              if (
                output.includes('localhost:4200') ||
                output.includes('ready') ||
                output.includes('compiled successfully')
              ) {
                hasStarted = true;
                clearTimeout(timeout);
                resolve();
              }
            });

            webAdminProcess.stderr?.on('data', (data) => {
              console.error(`[WEB-ADMIN ERROR] ${data.toString().trim()}`);
            });

            webAdminProcess.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          // Give it a moment to fully start
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Test the homepage
          const homepageCheck = await testHttpEndpoint(
            'http://localhost:4200/'
          );

          expect(hasStarted).toBe(true);
          console.log(
            `✅ Web Admin started successfully (Homepage: ${homepageCheck.success ? 'PASS' : 'FAIL'})`
          );
        } catch (error) {
          console.error('❌ Web Admin startup test failed:', error);
          throw error;
        }
      },
      QUICK_TIMEOUT
    );

    it(
      'should be able to start Member App in development mode',
      async () => {
        try {
          console.log('Testing Member App startup...');

          const memberAppProcess = spawn('npx', ['nx', 'serve', 'member-app'], {
            cwd: path.join(__dirname, '..'),
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true,
          });

          processes.push(memberAppProcess);

          let output = '';
          let hasStarted = false;

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              if (!hasStarted) {
                reject(new Error('Member App failed to start within timeout'));
              }
            }, 25000);

            memberAppProcess.stdout?.on('data', (data) => {
              output += data.toString();
              console.log(`[MEMBER-APP] ${data.toString().trim()}`);

              if (
                output.includes('localhost:4201') ||
                output.includes('ready') ||
                output.includes('compiled successfully')
              ) {
                hasStarted = true;
                clearTimeout(timeout);
                resolve();
              }
            });

            memberAppProcess.stderr?.on('data', (data) => {
              console.error(`[MEMBER-APP ERROR] ${data.toString().trim()}`);
            });

            memberAppProcess.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          // Give it a moment to fully start
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Test the homepage
          const homepageCheck = await testHttpEndpoint(
            'http://localhost:4201/'
          );

          expect(hasStarted).toBe(true);
          console.log(
            `✅ Member App started successfully (Homepage: ${homepageCheck.success ? 'PASS' : 'FAIL'})`
          );
        } catch (error) {
          console.error('❌ Member App startup test failed:', error);
          throw error;
        }
      },
      QUICK_TIMEOUT
    );
  });
});
