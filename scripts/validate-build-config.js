#!/usr/bin/env node

/**
 * Build Configuration Validation Script
 *
 * This script validates that all build optimization configurations are properly set up
 * without running actual builds.
 */

const fs = require('fs');
const path = require('path');

class ConfigValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  log(message) {
    console.log(`✓ ${message}`);
  }

  warn(message) {
    console.warn(`⚠ ${message}`);
    this.warnings.push(message);
  }

  error(message) {
    console.error(`✗ ${message}`);
    this.errors.push(message);
  }

  validateFile(filePath, description) {
    if (fs.existsSync(filePath)) {
      this.log(`${description} exists`);
      return true;
    } else {
      this.error(`${description} missing: ${filePath}`);
      return false;
    }
  }

  validateNxConfig() {
    console.log('\n📋 Validating NX Configuration...');

    const nxConfigPath = path.join(process.cwd(), 'nx.json');
    if (!this.validateFile(nxConfigPath, 'nx.json')) return;

    try {
      const nxConfig = JSON.parse(fs.readFileSync(nxConfigPath, 'utf8'));

      // Validate caching
      if (nxConfig.targetDefaults?.build?.cache) {
        this.log('Build caching enabled');
      } else {
        this.error('Build caching not enabled');
      }

      // Validate parallel execution
      if (nxConfig.parallel && nxConfig.parallel > 1) {
        this.log(`Parallel execution configured: ${nxConfig.parallel}`);
      } else {
        this.warn('Parallel execution not optimally configured');
      }

      // Validate cacheable operations
      const cacheableOps =
        nxConfig.tasksRunnerOptions?.default?.options?.cacheableOperations;
      if (cacheableOps && cacheableOps.includes('build')) {
        this.log('Build operations are cacheable');
      } else {
        this.error('Build operations not configured as cacheable');
      }

      // Validate named inputs
      if (nxConfig.namedInputs?.production) {
        this.log('Production named inputs configured');
      } else {
        this.error('Production named inputs not configured');
      }
    } catch (error) {
      this.error(`Invalid nx.json: ${error.message}`);
    }
  }

  validateBuildConfig() {
    console.log('\n🔧 Validating Build Configuration...');

    const buildConfigPath = path.join(process.cwd(), 'build.config.js');
    if (!this.validateFile(buildConfigPath, 'build.config.js')) return;

    try {
      const buildConfig = require(buildConfigPath);

      if (buildConfig.global) {
        this.log('Global build settings configured');
      } else {
        this.error('Global build settings missing');
      }

      if (buildConfig.applications) {
        this.log('Application build settings configured');
      } else {
        this.error('Application build settings missing');
      }

      if (buildConfig.libraries) {
        this.log('Library build settings configured');
      } else {
        this.error('Library build settings missing');
      }
    } catch (error) {
      this.error(`Invalid build.config.js: ${error.message}`);
    }
  }

  validateProjectConfigurations() {
    console.log('\n📁 Validating Project Configurations...');

    const projects = [
      { name: 'web-admin', path: 'apps/web-admin/project.json' },
      { name: 'member-app', path: 'apps/member-app/project.json' },
      { name: 'api', path: 'apps/api/project.json' },
      { name: 'shared-types', path: 'libs/shared/types/project.json' },
      { name: 'shared-utils', path: 'libs/shared/utils/project.json' },
      { name: 'ui', path: 'libs/shared/ui/project.json' },
    ];

    projects.forEach((project) => {
      const projectPath = path.join(process.cwd(), project.path);
      if (!this.validateFile(projectPath, `${project.name} project.json`))
        return;

      try {
        const projectConfig = JSON.parse(fs.readFileSync(projectPath, 'utf8'));

        if (projectConfig.targets?.build) {
          this.log(`${project.name} has build target`);

          if (projectConfig.targets.build.outputs) {
            this.log(`${project.name} has build outputs configured`);
          } else {
            this.warn(`${project.name} missing build outputs configuration`);
          }

          // Check for production configuration in apps
          if (project.path.startsWith('apps/')) {
            if (projectConfig.targets.build.configurations?.production) {
              this.log(`${project.name} has production build configuration`);
            } else {
              this.error(
                `${project.name} missing production build configuration`
              );
            }
          }
        } else {
          this.error(`${project.name} missing build target`);
        }
      } catch (error) {
        this.error(`Invalid ${project.name} project.json: ${error.message}`);
      }
    });
  }

  validateEnvironmentFiles() {
    console.log('\n🌍 Validating Environment Files...');

    const apps = ['web-admin', 'member-app', 'api'];

    apps.forEach((app) => {
      const envPath = path.join(
        process.cwd(),
        'apps',
        app,
        'src',
        'environments',
        'environment.ts'
      );
      const envProdPath = path.join(
        process.cwd(),
        'apps',
        app,
        'src',
        'environments',
        'environment.prod.ts'
      );

      this.validateFile(envPath, `${app} development environment`);
      this.validateFile(envProdPath, `${app} production environment`);
    });
  }

  validatePackageJsonScripts() {
    console.log('\n📦 Validating Package.json Scripts...');

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!this.validateFile(packageJsonPath, 'package.json')) return;

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const expectedScripts = [
        'build:all',
        'build:all:prod',
        'build:apps',
        'build:apps:prod',
        'build:libs',
        'build:optimize',
        'build:optimize:prod',
        'affected:build:prod',
        'clean:cache',
        'clean:dist',
      ];

      expectedScripts.forEach((script) => {
        if (packageJson.scripts[script]) {
          this.log(`Script '${script}' configured`);
        } else {
          this.error(`Script '${script}' missing`);
        }
      });
    } catch (error) {
      this.error(`Invalid package.json: ${error.message}`);
    }
  }

  validateOptimizationFiles() {
    console.log('\n⚡ Validating Optimization Files...');

    this.validateFile(
      path.join(process.cwd(), 'scripts', 'build-optimization.js'),
      'Build optimization script'
    );

    this.validateFile(path.join(process.cwd(), '.nxignore'), 'NX ignore file');

    this.validateFile(
      path.join(process.cwd(), 'tools', 'build-validation.spec.ts'),
      'Build validation tests'
    );
  }

  generateReport() {
    console.log('\n📊 Validation Report');
    console.log('='.repeat(50));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All build optimization configurations are valid!');
    } else {
      if (this.errors.length > 0) {
        console.log(`\n❌ Errors (${this.errors.length}):`);
        this.errors.forEach((error) => console.log(`  - ${error}`));
      }

      if (this.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
        this.warnings.forEach((warning) => console.log(`  - ${warning}`));
      }
    }

    console.log(
      `\n📈 Summary: ${this.errors.length} errors, ${this.warnings.length} warnings`
    );

    return this.errors.length === 0;
  }

  validate() {
    console.log('🔍 Build Configuration Validation');
    console.log('='.repeat(50));

    this.validateNxConfig();
    this.validateBuildConfig();
    this.validateProjectConfigurations();
    this.validateEnvironmentFiles();
    this.validatePackageJsonScripts();
    this.validateOptimizationFiles();

    return this.generateReport();
  }
}

// Run validation
const validator = new ConfigValidator();
const isValid = validator.validate();

process.exit(isValid ? 0 : 1);
