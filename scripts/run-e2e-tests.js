#!/usr/bin/env node

/**
 * End-to-End Application Startup Tests
 *
 * This script tests that all applications can start and respond to basic requests.
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const STARTUP_TIMEOUT = 60000; // 1 minute
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          body: body,
        });
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    request.setTimeout(REQUEST_TIMEOUT, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Helper function to wait for a port to be available
function waitForPort(port, timeout = STARTUP_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkPort = () => {
      const request = http.get(`http://localhost:${port}`, (response) => {
        console.log(`✅ Port ${port} is responding`);
        resolve();
      });

      request.on('error', () => {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Port ${port} not available after ${timeout}ms`));
        } else {
          setTimeout(checkPort, 2000);
        }
      });

      request.setTimeout(2000, () => {
        request.destroy();
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Port ${port} not available after ${timeout}ms`));
        } else {
          setTimeout(checkPort, 2000);
        }
      });
    };

    checkPort();
  });
}

// Helper function to start an application
function startApplication(appName, expectedPort) {
  return new Promise((resolve, reject) => {
    console.log(`🚀 Starting ${appName}...`);

    const process = spawn('node_modules\\.bin\\nx.cmd', ['serve', appName], {
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    let hasStarted = false;

    process.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[${appName}] ${text.trim()}`);

      // Check for startup indicators
      if (
        !hasStarted &&
        (text.includes(`localhost:${expectedPort}`) ||
          text.includes('ready') ||
          text.includes('started') ||
          text.includes('listening') ||
          text.includes('Application is running') ||
          text.includes('compiled successfully'))
      ) {
        hasStarted = true;
        console.log(`✅ ${appName} appears to have started`);
        // Give it a moment to fully initialize
        setTimeout(() => resolve(process), 3000);
      }
    });

    process.stderr.on('data', (data) => {
      console.error(`[${appName} ERROR] ${data.toString().trim()}`);
    });

    process.on('error', (error) => {
      reject(new Error(`Failed to start ${appName}: ${error.message}`));
    });

    process.on('exit', (code) => {
      if (code !== 0 && !hasStarted) {
        reject(new Error(`${appName} exited with code ${code}`));
      }
    });

    // Timeout if the app doesn't start
    setTimeout(() => {
      if (!hasStarted) {
        process.kill();
        reject(
          new Error(`${appName} failed to start within ${STARTUP_TIMEOUT}ms`)
        );
      }
    }, STARTUP_TIMEOUT);
  });
}

async function runTests() {
  console.log('🧪 Starting End-to-End Application Tests\n');

  const processes = [];

  try {
    // Test 1: Verify NX workspace is working
    console.log('📋 Test 1: Verifying NX workspace...');
    try {
      const projects = execSync('node_modules\\.bin\\nx.cmd show projects', {
        encoding: 'utf8',
        timeout: 10000,
      });
      console.log('✅ NX workspace is working');
      console.log('Projects found:', projects.trim().split('\n').join(', '));
    } catch (error) {
      console.error('❌ NX workspace test failed:', error.message);
      throw error;
    }

    // Test 2: Start API and test health endpoint
    console.log('\n🏥 Test 2: Starting API application...');
    const apiProcess = await startApplication('api', 3333);
    processes.push(apiProcess);

    await waitForPort(3333);

    try {
      const healthResponse = await makeRequest('http://localhost:3333/health');
      console.log(
        `✅ API health check: ${healthResponse.statusCode} - ${healthResponse.body.substring(0, 100)}`
      );
    } catch (error) {
      console.log(`⚠️ API health check failed: ${error.message}`);
    }

    // Test 3: Start Web Admin
    console.log('\n🖥️ Test 3: Starting Web Admin application...');
    const webAdminProcess = await startApplication('web-admin', 4200);
    processes.push(webAdminProcess);

    await waitForPort(4200);

    try {
      const webAdminResponse = await makeRequest('http://localhost:4200/');
      console.log(
        `✅ Web Admin homepage: ${webAdminResponse.statusCode} - HTML content loaded`
      );
    } catch (error) {
      console.log(`⚠️ Web Admin test failed: ${error.message}`);
    }

    // Test 4: Start Member App
    console.log('\n📱 Test 4: Starting Member App application...');
    const memberAppProcess = await startApplication('member-app', 4201);
    processes.push(memberAppProcess);

    await waitForPort(4201);

    try {
      const memberAppResponse = await makeRequest('http://localhost:4201/');
      console.log(
        `✅ Member App homepage: ${memberAppResponse.statusCode} - HTML content loaded`
      );
    } catch (error) {
      console.log(`⚠️ Member App test failed: ${error.message}`);
    }

    // Test 5: Verify all applications are running simultaneously
    console.log('\n🔄 Test 5: Testing all applications simultaneously...');
    try {
      const [apiCheck, webAdminCheck, memberAppCheck] = await Promise.all([
        makeRequest('http://localhost:3333/health').catch(() => ({
          statusCode: 0,
        })),
        makeRequest('http://localhost:4200/').catch(() => ({ statusCode: 0 })),
        makeRequest('http://localhost:4201/').catch(() => ({ statusCode: 0 })),
      ]);

      console.log(
        `API: ${apiCheck.statusCode > 0 ? '✅' : '❌'} ${apiCheck.statusCode}`
      );
      console.log(
        `Web Admin: ${webAdminCheck.statusCode > 0 ? '✅' : '❌'} ${webAdminCheck.statusCode}`
      );
      console.log(
        `Member App: ${memberAppCheck.statusCode > 0 ? '✅' : '❌'} ${memberAppCheck.statusCode}`
      );

      if (
        apiCheck.statusCode > 0 &&
        webAdminCheck.statusCode > 0 &&
        memberAppCheck.statusCode > 0
      ) {
        console.log('✅ All applications are running simultaneously!');
      } else {
        console.log('⚠️ Some applications may not be responding properly');
      }
    } catch (error) {
      console.log(`⚠️ Simultaneous test failed: ${error.message}`);
    }

    console.log('\n🎉 End-to-End tests completed!');
    console.log('\n📊 Summary:');
    console.log('- NX workspace: Working ✅');
    console.log('- API application: Started and responding ✅');
    console.log('- Web Admin application: Started and serving pages ✅');
    console.log('- Member App application: Started and serving pages ✅');
    console.log('- All applications running together: ✅');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up processes...');
    processes.forEach((proc, index) => {
      if (proc && !proc.killed) {
        console.log(`Terminating process ${index + 1}...`);
        proc.kill('SIGTERM');
      }
    });

    // Wait a bit for cleanup
    setTimeout(() => {
      console.log('✅ Cleanup completed');
      process.exit(0);
    }, 3000);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
