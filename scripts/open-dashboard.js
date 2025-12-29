#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const dashboardPath = path.join(process.cwd(), 'task-dashboard.html');

if (!fs.existsSync(dashboardPath)) {
  console.error('❌ Task dashboard not found!');
  process.exit(1);
}

console.log('🚀 Opening Task Dashboard...');

try {
  // Try different commands based on the platform
  const platform = process.platform;

  if (platform === 'win32') {
    execSync(`start "" "${dashboardPath}"`, { stdio: 'ignore' });
  } else if (platform === 'darwin') {
    execSync(`open "${dashboardPath}"`, { stdio: 'ignore' });
  } else {
    execSync(`xdg-open "${dashboardPath}"`, { stdio: 'ignore' });
  }

  console.log('✅ Task Dashboard opened in your default browser!');
  console.log(`📍 Location: ${dashboardPath}`);
} catch (error) {
  console.log('⚠️  Could not auto-open dashboard. Please open manually:');
  console.log(`📍 File: ${dashboardPath}`);
  console.log('💡 Or copy this path to your browser address bar.');
}
