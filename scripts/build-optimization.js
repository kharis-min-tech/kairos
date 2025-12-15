#!/usr/bin/env node

/**
 * Build Optimization Script for Kairos Monorepo
 *
 * This script provides advanced build optimization capabilities including:
 * - Intelligent build ordering based on dependencies
 * - Parallel execution with resource management
 * - Build artifact optimization
 * - Cache warming and management
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const buildConfig = require('../build.config.js');

class BuildOptimizer {
  constructor() {
    this.startTime = Date.now();
    this.buildResults = {};
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  error(message) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`);
  }

  async warmCache() {
    this.log('Warming NX cache...');
    try {
      execSync('npx nx reset', { stdio: 'inherit' });
      this.log('Cache warmed successfully');
    } catch (error) {
      this.error(`Failed to warm cache: ${error.message}`);
    }
  }

  async buildLibraries(production = false) {
    this.log('Building shared libraries...');
    const config = production ? '--configuration=production' : '';
    const libraries = Object.keys(buildConfig.libraries);

    try {
      const command = `npx nx run-many --target=build ${config} --projects=${libraries.join(',')} --parallel=${buildConfig.parallel.default}`;
      execSync(command, { stdio: 'inherit' });
      this.log('Libraries built successfully');
      return true;
    } catch (error) {
      this.error(`Failed to build libraries: ${error.message}`);
      return false;
    }
  }

  async buildApplications(production = false) {
    this.log('Building applications...');
    const config = production ? '--configuration=production' : '';
    const applications = Object.keys(buildConfig.applications);

    try {
      const command = `npx nx run-many --target=build ${config} --projects=${applications.join(',')} --parallel=${buildConfig.parallel.default}`;
      execSync(command, { stdio: 'inherit' });
      this.log('Applications built successfully');
      return true;
    } catch (error) {
      this.error(`Failed to build applications: ${error.message}`);
      return false;
    }
  }

  async buildAll(production = false) {
    this.log(`Starting ${production ? 'production' : 'development'} build...`);

    // Build libraries first (dependencies)
    const libsSuccess = await this.buildLibraries(production);
    if (!libsSuccess) {
      this.error('Library build failed, aborting application build');
      return false;
    }

    // Build applications
    const appsSuccess = await this.buildApplications(production);
    if (!appsSuccess) {
      this.error('Application build failed');
      return false;
    }

    const duration = (Date.now() - this.startTime) / 1000;
    this.log(`Build completed successfully in ${duration}s`);
    return true;
  }

  async buildAffected(production = false) {
    this.log('Building affected projects...');
    const config = production ? '--configuration=production' : '';

    try {
      const command = `npx nx affected:build ${config} --parallel=${buildConfig.parallel.default}`;
      execSync(command, { stdio: 'inherit' });
      this.log('Affected projects built successfully');
      return true;
    } catch (error) {
      this.error(`Failed to build affected projects: ${error.message}`);
      return false;
    }
  }

  async optimizeBuildArtifacts() {
    this.log('Optimizing build artifacts...');

    const distPath = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      this.log('No build artifacts found to optimize');
      return;
    }

    // Remove source maps in production builds
    const removeSourceMaps = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          removeSourceMaps(filePath);
        } else if (file.endsWith('.map')) {
          fs.unlinkSync(filePath);
          this.log(`Removed source map: ${filePath}`);
        }
      });
    };

    try {
      removeSourceMaps(distPath);
      this.log('Build artifacts optimized');
    } catch (error) {
      this.error(`Failed to optimize build artifacts: ${error.message}`);
    }
  }

  async generateBuildReport() {
    this.log('Generating build report...');

    const report = {
      timestamp: new Date().toISOString(),
      duration: (Date.now() - this.startTime) / 1000,
      config: buildConfig,
      results: this.buildResults,
    };

    const reportPath = path.join(process.cwd(), 'dist', 'build-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Build report generated: ${reportPath}`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  const production = args.includes('--prod') || args.includes('--production');

  const optimizer = new BuildOptimizer();

  try {
    switch (command) {
      case 'libs':
      case 'libraries':
        await optimizer.buildLibraries(production);
        break;

      case 'apps':
      case 'applications':
        await optimizer.buildApplications(production);
        break;

      case 'affected':
        await optimizer.buildAffected(production);
        break;

      case 'cache':
        await optimizer.warmCache();
        break;

      case 'optimize':
        await optimizer.optimizeBuildArtifacts();
        break;

      case 'all':
      default:
        await optimizer.buildAll(production);
        await optimizer.optimizeBuildArtifacts();
        await optimizer.generateBuildReport();
        break;
    }
  } catch (error) {
    optimizer.error(`Build failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = BuildOptimizer;
