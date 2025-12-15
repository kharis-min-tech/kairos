/**
 * Build Validation Tests
 *
 * These tests validate that the build optimization configuration is working correctly
 * and that all applications and libraries can be built successfully.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Build Optimization Configuration', () => {
  const rootPath = path.join(__dirname, '..');
  const distPath = path.join(rootPath, 'dist');

  beforeAll(() => {
    // Clean dist directory before tests
    if (fs.existsSync(distPath)) {
      fs.rmSync(distPath, { recursive: true, force: true });
    }
  });

  describe('NX Configuration', () => {
    it('should have valid nx.json configuration', () => {
      const nxConfigPath = path.join(rootPath, 'nx.json');
      expect(fs.existsSync(nxConfigPath)).toBe(true);

      const nxConfig = JSON.parse(fs.readFileSync(nxConfigPath, 'utf8'));

      // Validate caching configuration
      expect(nxConfig.targetDefaults.build.cache).toBe(true);
      expect(nxConfig.targetDefaults.test.cache).toBe(true);
      expect(nxConfig.targetDefaults.lint.cache).toBe(true);

      // Validate parallel execution
      expect(nxConfig.parallel).toBeGreaterThan(1);
      expect(nxConfig.maxParallel).toBeGreaterThan(nxConfig.parallel);

      // Validate cacheable operations
      const cacheableOps =
        nxConfig.tasksRunnerOptions.default.options.cacheableOperations;
      expect(cacheableOps).toContain('build');
      expect(cacheableOps).toContain('lint');
      expect(cacheableOps).toContain('test');
    });

    it('should have proper named inputs configuration', () => {
      const nxConfigPath = path.join(rootPath, 'nx.json');
      const nxConfig = JSON.parse(fs.readFileSync(nxConfigPath, 'utf8'));

      expect(nxConfig.namedInputs.production).toBeDefined();
      expect(nxConfig.namedInputs.default).toBeDefined();
      expect(nxConfig.namedInputs.sharedGlobals).toBeDefined();

      // Validate production inputs exclude test files
      const productionInputs = nxConfig.namedInputs.production;
      expect(
        productionInputs.some((input: string) => input.includes('spec|test'))
      ).toBe(true);
    });
  });

  describe('Build Configuration Files', () => {
    it('should have build.config.js file', () => {
      const buildConfigPath = path.join(rootPath, 'build.config.js');
      expect(fs.existsSync(buildConfigPath)).toBe(true);

      const buildConfig = require(buildConfigPath);
      expect(buildConfig.global).toBeDefined();
      expect(buildConfig.applications).toBeDefined();
      expect(buildConfig.libraries).toBeDefined();
      expect(buildConfig.production).toBeDefined();
      expect(buildConfig.development).toBeDefined();
    });

    it('should have build optimization script', () => {
      const scriptPath = path.join(
        rootPath,
        'scripts',
        'build-optimization.js'
      );
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it('should have .nxignore file', () => {
      const nxIgnorePath = path.join(rootPath, '.nxignore');
      expect(fs.existsSync(nxIgnorePath)).toBe(true);
    });
  });

  describe('Environment Files', () => {
    const apps = ['web-admin', 'member-app', 'api'];

    apps.forEach((app) => {
      it(`should have environment files for ${app}`, () => {
        const envPath = path.join(
          rootPath,
          'apps',
          app,
          'src',
          'environments',
          'environment.ts'
        );
        const envProdPath = path.join(
          rootPath,
          'apps',
          app,
          'src',
          'environments',
          'environment.prod.ts'
        );

        expect(fs.existsSync(envPath)).toBe(true);
        expect(fs.existsSync(envProdPath)).toBe(true);
      });
    });
  });

  describe('Project Configurations', () => {
    const projects = [
      { name: 'web-admin', type: 'app' },
      { name: 'member-app', type: 'app' },
      { name: 'api', type: 'app' },
      { name: 'shared-types', type: 'lib', path: 'libs/shared/types' },
      { name: 'shared-utils', type: 'lib', path: 'libs/shared/utils' },
      { name: 'ui', type: 'lib', path: 'libs/shared/ui' },
    ];

    projects.forEach((project) => {
      it(`should have valid project.json for ${project.name}`, () => {
        const projectPath =
          project.type === 'app'
            ? path.join(rootPath, 'apps', project.name, 'project.json')
            : path.join(
                rootPath,
                project.path || `libs/${project.name}`,
                'project.json'
              );

        expect(fs.existsSync(projectPath)).toBe(true);

        const projectConfig = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
        expect(projectConfig.targets.build).toBeDefined();
        expect(projectConfig.targets.build.outputs).toBeDefined();

        if (project.type === 'app') {
          expect(projectConfig.targets.build.configurations).toBeDefined();
          expect(
            projectConfig.targets.build.configurations.production
          ).toBeDefined();
        }
      });
    });
  });

  describe('Package.json Scripts', () => {
    it('should have build optimization scripts', () => {
      const packageJsonPath = path.join(rootPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const expectedScripts = [
        'build:all',
        'build:all:prod',
        'build:apps',
        'build:apps:prod',
        'build:libs',
        'build:optimize',
        'build:optimize:prod',
        'build:affected:optimize',
        'affected:build:prod',
        'clean:cache',
        'clean:dist',
      ];

      expectedScripts.forEach((script) => {
        expect(packageJson.scripts[script]).toBeDefined();
      });
    });
  });

  describe('Build Execution', () => {
    it('should build shared libraries successfully', () => {
      expect(() => {
        execSync('npm run build:libs', {
          cwd: rootPath,
          stdio: 'pipe',
          timeout: 120000, // 2 minutes timeout
        });
      }).not.toThrow();

      // Verify build artifacts exist
      expect(
        fs.existsSync(path.join(distPath, 'libs', 'shared', 'types'))
      ).toBe(true);
      expect(
        fs.existsSync(path.join(distPath, 'libs', 'shared', 'utils'))
      ).toBe(true);
      expect(fs.existsSync(path.join(distPath, 'libs', 'shared', 'ui'))).toBe(
        true
      );
    });

    it('should build applications successfully', () => {
      expect(() => {
        execSync('npm run build:apps', {
          cwd: rootPath,
          stdio: 'pipe',
          timeout: 300000, // 5 minutes timeout
        });
      }).not.toThrow();

      // Verify build artifacts exist
      expect(fs.existsSync(path.join(distPath, 'apps', 'web-admin'))).toBe(
        true
      );
      expect(fs.existsSync(path.join(distPath, 'apps', 'member-app'))).toBe(
        true
      );
      expect(fs.existsSync(path.join(distPath, 'apps', 'api'))).toBe(true);
    });

    it('should run build optimization script', () => {
      expect(() => {
        execSync('npm run build:optimize', {
          cwd: rootPath,
          stdio: 'pipe',
          timeout: 300000, // 5 minutes timeout
        });
      }).not.toThrow();

      // Verify build report is generated
      expect(fs.existsSync(path.join(distPath, 'build-report.json'))).toBe(
        true
      );
    });

    it('should run affected build successfully', () => {
      expect(() => {
        execSync('npm run affected:build', {
          cwd: rootPath,
          stdio: 'pipe',
          timeout: 300000, // 5 minutes timeout
        });
      }).not.toThrow();
    });
  });

  describe('Cache Functionality', () => {
    it('should have cache directory configured', () => {
      const nxConfigPath = path.join(rootPath, 'nx.json');
      const nxConfig = JSON.parse(fs.readFileSync(nxConfigPath, 'utf8'));

      expect(nxConfig.cacheDirectory).toBe('.nx/cache');
    });

    it('should create cache directory during build', () => {
      // Run a simple build command to trigger cache creation
      const nxPath = path.join(rootPath, 'node_modules', '.bin', 'nx.cmd');
      execSync(`"${nxPath}" build shared-types`, {
        cwd: rootPath,
        stdio: 'pipe',
      });

      const cachePath = path.join(rootPath, '.nx', 'cache');
      expect(fs.existsSync(cachePath)).toBe(true);
    });
  });

  describe('Production Build Configuration', () => {
    it('should have production-specific settings for Next.js apps', () => {
      const webAdminConfig = JSON.parse(
        fs.readFileSync(
          path.join(rootPath, 'apps', 'web-admin', 'project.json'),
          'utf8'
        )
      );

      const prodConfig = webAdminConfig.targets.build.configurations.production;
      expect(prodConfig.optimization).toBe(true);
      expect(prodConfig.outputHashing).toBe('all');
      expect(prodConfig.sourceMap).toBe(false);
      expect(prodConfig.extractLicenses).toBe(true);
    });

    it('should have production-specific settings for NestJS API', () => {
      const apiConfig = JSON.parse(
        fs.readFileSync(
          path.join(rootPath, 'apps', 'api', 'project.json'),
          'utf8'
        )
      );

      const prodConfig = apiConfig.targets.build.configurations.production;
      expect(prodConfig.optimization).toBe(true);
      expect(prodConfig.extractLicenses).toBe(true);
      expect(prodConfig.generatePackageJson).toBe(true);
    });
  });
});
