import * as fs from 'fs';
import * as path from 'path';

describe('Scaffold Structure Validation', () => {
  const workspaceRoot = process.cwd();

  describe('Directory Structure', () => {
    it('should have all required application directories', () => {
      const requiredAppDirs = [
        'apps/web-admin',
        'apps/member-app',
        'apps/api',
        'apps/web-admin-e2e',
        'apps/member-app-e2e',
      ];

      requiredAppDirs.forEach((dir) => {
        const fullPath = path.join(workspaceRoot, dir);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).isDirectory()).toBe(true);
      });
    });

    it('should have all required library directories', () => {
      const requiredLibDirs = [
        'libs/shared/types',
        'libs/shared/utils',
        'libs/shared/ui',
      ];

      requiredLibDirs.forEach((dir) => {
        const fullPath = path.join(workspaceRoot, dir);
        expect(fs.existsSync(fullPath)).toBe(true);
        expect(fs.statSync(fullPath).isDirectory()).toBe(true);
      });
    });

    it('should have proper Next.js app structure', () => {
      const nextApps = ['apps/web-admin', 'apps/member-app'];

      nextApps.forEach((app) => {
        const requiredFiles = [
          `${app}/src/app/layout.tsx`,
          `${app}/src/app/page.tsx`,
          `${app}/next.config.js`,
          `${app}/package.json`,
          `${app}/tailwind.config.js`,
        ];

        requiredFiles.forEach((file) => {
          const fullPath = path.join(workspaceRoot, file);
          expect(fs.existsSync(fullPath)).toBe(true);
        });
      });
    });

    it('should have proper NestJS API structure', () => {
      const requiredApiFiles = [
        'apps/api/src/main.ts',
        'apps/api/src/app/app.module.ts',
        'apps/api/src/app/app.controller.ts',
        'apps/api/src/app/app.service.ts',
      ];

      requiredApiFiles.forEach((file) => {
        const fullPath = path.join(workspaceRoot, file);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    it('should have API module directories', () => {
      const requiredModules = [
        'members',
        'departments',
        'fellowships',
        'events',
        'finance',
        'forms',
        'communications',
        'security',
        'settings',
        'outreach',
      ];

      requiredModules.forEach((module) => {
        const modulePath = path.join(
          workspaceRoot,
          `apps/api/src/modules/${module}`
        );
        expect(fs.existsSync(modulePath)).toBe(true);
        expect(fs.statSync(modulePath).isDirectory()).toBe(true);

        // Check for required module files
        const moduleFiles = [
          `${module}.module.ts`,
          `${module}.controller.ts`,
          `${module}.service.ts`,
        ];

        moduleFiles.forEach((file) => {
          const filePath = path.join(modulePath, file);
          expect(fs.existsSync(filePath)).toBe(true);
        });
      });
    });
  });

  describe('Configuration Files', () => {
    it('should have root configuration files', () => {
      const requiredRootFiles = [
        'package.json',
        'nx.json',
        'tsconfig.base.json',
        'jest.config.ts',
        'jest.preset.js',
        '.eslintrc.json',
        '.prettierrc',
        '.gitignore',
        '.editorconfig',
      ];

      requiredRootFiles.forEach((file) => {
        const fullPath = path.join(workspaceRoot, file);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    it('should have project.json files for all projects', () => {
      const projects = [
        'apps/web-admin',
        'apps/member-app',
        'apps/api',
        'apps/web-admin-e2e',
        'apps/member-app-e2e',
        'libs/shared/types',
        'libs/shared/utils',
        'libs/shared/ui',
      ];

      projects.forEach((project) => {
        const projectJsonPath = path.join(
          workspaceRoot,
          project,
          'project.json'
        );
        expect(fs.existsSync(projectJsonPath)).toBe(true);
      });
    });

    it('should have Jest configuration files', () => {
      const jestConfigs = [
        'apps/api/jest.config.ts',
        'apps/web-admin/jest.config.ts',
        'apps/member-app/jest.config.ts',
        'libs/shared/types/jest.config.ts',
        'libs/shared/utils/jest.config.ts',
        'libs/shared/ui/jest.config.ts',
      ];

      jestConfigs.forEach((config) => {
        const fullPath = path.join(workspaceRoot, config);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    it('should have Playwright configuration files', () => {
      const playwrightConfigs = [
        'apps/web-admin-e2e/playwright.config.ts',
        'apps/member-app-e2e/playwright.config.ts',
      ];

      playwrightConfigs.forEach((config) => {
        const fullPath = path.join(workspaceRoot, config);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });

    it('should have environment example files', () => {
      const envFiles = [
        'apps/api/.env.example',
        'apps/web-admin/.env.example',
        'apps/member-app/.env.example',
      ];

      envFiles.forEach((file) => {
        const fullPath = path.join(workspaceRoot, file);
        expect(fs.existsSync(fullPath)).toBe(true);
      });
    });
  });

  describe('TypeScript Path Aliases', () => {
    it('should have TypeScript path aliases configured', () => {
      const tsConfigPath = path.join(workspaceRoot, 'tsconfig.base.json');
      expect(fs.existsSync(tsConfigPath)).toBe(true);

      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
      const paths = tsConfig.compilerOptions?.paths;

      expect(paths).toBeDefined();
      expect(paths['@kairos/shared-types']).toBeDefined();
      expect(paths['@kairos/shared-utils']).toBeDefined();
      expect(paths['@kairos/ui']).toBeDefined();
    });

    it('should have correct path mappings', () => {
      const tsConfigPath = path.join(workspaceRoot, 'tsconfig.base.json');
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));
      const paths = tsConfig.compilerOptions.paths;

      expect(paths['@kairos/shared-types']).toEqual([
        'libs/shared/types/src/index.ts',
      ]);
      expect(paths['@kairos/shared-utils']).toEqual([
        'libs/shared/utils/src/index.ts',
      ]);
      expect(paths['@kairos/ui']).toEqual(['libs/shared/ui/src/index.ts']);
    });
  });

  describe('Dependencies', () => {
    it('should have required dependencies installed', () => {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Core dependencies
      const requiredDeps = [
        '@nestjs/core',
        '@nestjs/common',
        '@nestjs/platform-express',
        '@prisma/client',
        'next',
        'react',
        'react-dom',
        'reflect-metadata',
        'rxjs',
      ];

      requiredDeps.forEach((dep) => {
        expect(packageJson.dependencies[dep]).toBeDefined();
      });
    });

    it('should have required dev dependencies installed', () => {
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const requiredDevDeps = [
        '@nx/jest',
        '@nx/playwright',
        '@nx/next',
        '@nx/nest',
        '@nx/react',
        '@playwright/test',
        '@testing-library/jest-dom',
        '@testing-library/react',
        'jest',
        'ts-jest',
        'typescript',
        'eslint',
        'prettier',
        'tailwindcss',
      ];

      requiredDevDeps.forEach((dep) => {
        expect(packageJson.devDependencies[dep]).toBeDefined();
      });
    });

    it('should have NX workspace configuration', () => {
      const nxJsonPath = path.join(workspaceRoot, 'nx.json');
      const nxConfig = JSON.parse(fs.readFileSync(nxJsonPath, 'utf8'));

      expect(nxConfig.targetDefaults).toBeDefined();
      expect(nxConfig.targetDefaults.build).toBeDefined();
      expect(nxConfig.targetDefaults.test).toBeDefined();
      expect(nxConfig.targetDefaults.lint).toBeDefined();
      expect(nxConfig.targetDefaults.e2e).toBeDefined();
    });
  });

  describe('Shared Libraries Content', () => {
    it('should have shared types library with proper exports', () => {
      const indexPath = path.join(
        workspaceRoot,
        'libs/shared/types/src/index.ts'
      );
      expect(fs.existsSync(indexPath)).toBe(true);

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('export');
    });

    it('should have shared utils library with proper exports', () => {
      const indexPath = path.join(
        workspaceRoot,
        'libs/shared/utils/src/index.ts'
      );
      expect(fs.existsSync(indexPath)).toBe(true);

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('export');
    });

    it('should have UI library with proper exports', () => {
      const indexPath = path.join(workspaceRoot, 'libs/shared/ui/src/index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);

      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('export');
    });

    it('should have design tokens in UI library', () => {
      const designTokensPath = path.join(
        workspaceRoot,
        'libs/shared/ui/src/design-tokens'
      );
      expect(fs.existsSync(designTokensPath)).toBe(true);

      const requiredTokenFiles = ['colors.ts', 'typography.ts', 'spacing.ts'];

      requiredTokenFiles.forEach((file) => {
        const filePath = path.join(designTokensPath, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });
});
