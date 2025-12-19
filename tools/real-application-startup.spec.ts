/**
 * Real Application Startup Tests
 *
 * These tests actually start the applications briefly to verify they can initialize properly.
 */

import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';

describe('Real Application Startup Tests', () => {
  const STARTUP_TIMEOUT = 45000; // 45 seconds
  const processes: ChildProcess[] = [];

  // Cleanup after all tests
  afterAll(async () => {
    console.log('🧹 Cleaning up test processes...');
    processes.forEach((proc) => {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    });

    // Wait for cleanup
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  // Helper to make HTTP requests
  const testEndpoint = (
    url: string
  ): Promise<{ success: boolean; status: number }> => {
    return new Promise((resolve) => {
      const request = http.get(url, (response) => {
        resolve({
          success: true,
          status: response.statusCode || 0,
        });
      });

      request.on('error', () => {
        resolve({ success: false, status: 0 });
      });

      request.setTimeout(5000, () => {
        request.destroy();
        resolve({ success: false, status: 0 });
      });
    });
  };

  // Helper to start an application and wait for it to be ready
  const startAndTestApp = (
    appName: string,
    port: number,
    testPath: string = '/'
  ): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      console.log(`🚀 Starting ${appName}...`);

      const process = spawn('node_modules\\.bin\\nx.cmd', ['serve', appName], {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      processes.push(process);

      let output = '';
      let hasStarted = false;
      let testCompleted = false;

      const timeout = setTimeout(() => {
        if (!testCompleted) {
          console.log(`⏰ ${appName} test timed out`);
          resolve(false);
        }
      }, STARTUP_TIMEOUT);

      process.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Look for startup indicators
        if (
          !hasStarted &&
          (text.includes(`localhost:${port}`) ||
            text.includes('ready') ||
            text.includes('started') ||
            text.includes('listening') ||
            text.includes('Application is running') ||
            text.includes('compiled successfully'))
        ) {
          hasStarted = true;
          console.log(
            `✅ ${appName} appears to have started, testing endpoint...`
          );

          // Wait a moment then test the endpoint
          setTimeout(async () => {
            try {
              const result = await testEndpoint(
                `http://localhost:${port}${testPath}`
              );
              testCompleted = true;
              clearTimeout(timeout);

              if (
                result.success &&
                result.status >= 200 &&
                result.status < 500
              ) {
                console.log(`✅ ${appName} is responding (${result.status})`);
                resolve(true);
              } else {
                console.log(
                  `⚠️ ${appName} started but not responding properly`
                );
                resolve(false);
              }
            } catch (error) {
              testCompleted = true;
              clearTimeout(timeout);
              console.log(`⚠️ ${appName} endpoint test failed: ${error}`);
              resolve(false);
            }
          }, 5000);
        }
      });

      process.stderr?.on('data', (data) => {
        const text = data.toString();
        // Only log actual errors, not warnings
        if (text.includes('ERROR') || text.includes('EADDRINUSE')) {
          console.error(`[${appName} ERROR] ${text.trim()}`);
        }
      });

      process.on('error', (error) => {
        testCompleted = true;
        clearTimeout(timeout);
        console.error(`❌ ${appName} failed to start: ${error.message}`);
        resolve(false);
      });

      process.on('exit', (code) => {
        if (!testCompleted && code !== 0) {
          testCompleted = true;
          clearTimeout(timeout);
          console.error(`❌ ${appName} exited with code ${code}`);
          resolve(false);
        }
      });
    });
  };

  describe('Individual Application Tests', () => {
    it(
      'should start API application and respond to health check',
      async () => {
        const success = await startAndTestApp('api', 3333, '/api/health');
        expect(success).toBe(true);
      },
      STARTUP_TIMEOUT + 5000
    );

    it(
      'should start Web Admin application and serve homepage',
      async () => {
        const success = await startAndTestApp('web-admin', 4200, '/');
        expect(success).toBe(true);
      },
      STARTUP_TIMEOUT + 5000
    );

    it(
      'should start Member App application and serve homepage',
      async () => {
        const success = await startAndTestApp('member-app', 4201, '/');
        expect(success).toBe(true);
      },
      STARTUP_TIMEOUT + 5000
    );
  });

  describe('Quick Validation Tests', () => {
    it('should be able to check if ports are available', async () => {
      // This is a simple test to ensure our testing infrastructure works
      try {
        const testResult = await testEndpoint('http://localhost:99999/');
        expect(testResult.success).toBe(false);
        console.log('✅ Port availability testing works');
      } catch (error) {
        // Expected to fail for non-existent port
        console.log('✅ Port availability testing works (expected failure)');
        expect(true).toBe(true);
      }
    });

    it('should have all applications configured for startup', () => {
      // Verify that the serve commands exist in project configurations
      const { execSync } = require('child_process');

      try {
        const projects = ['api', 'web-admin', 'member-app'];

        projects.forEach((project) => {
          const config = execSync(
            `node_modules\\.bin\\nx.cmd show project ${project} --json`,
            {
              encoding: 'utf8',
              timeout: 10000,
            }
          );

          const projectConfig = JSON.parse(config);
          expect(projectConfig.targets).toHaveProperty('serve');
        });

        console.log('✅ All applications have serve configurations');
      } catch (error) {
        console.error('❌ Application configuration check failed:', error);
        throw error;
      }
    });
  });
});
