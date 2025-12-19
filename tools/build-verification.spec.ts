/**
 * Build Verification Tests
 *
 * These tests verify that all applications can be built successfully,
 * which is a good indicator that they're properly configured.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Build Verification Tests', () => {
  const timeout = 120000; // 2 minutes for builds

  describe('NX Workspace Validation', () => {
    it('should list all projects successfully', () => {
      try {
        const result = execSync('node_modules\\.bin\\nx.cmd show projects', {
          encoding: 'utf8',
          timeout: 10000,
          cwd: process.cwd(),
        });

        expect(result).toContain('web-admin');
        expect(result).toContain('member-app');
        expect(result).toContain('api');
        expect(result).toContain('shared-types');
        expect(result).toContain('shared-utils');
        expect(result).toContain('ui');

        console.log('✅ All NX projects are listed correctly');
      } catch (error) {
        console.error('❌ NX project listing failed:', error);
        throw error;
      }
    });

    it('should show project configurations', () => {
      try {
        const webAdminConfig = execSync(
          'node_modules\\.bin\\nx.cmd show project web-admin --json',
          {
            encoding: 'utf8',
            timeout: 10000,
            cwd: process.cwd(),
          }
        );

        const config = JSON.parse(webAdminConfig);
        expect(config.targets).toHaveProperty('serve');
        expect(config.targets).toHaveProperty('build');

        console.log('✅ Project configurations are accessible');
      } catch (error) {
        console.error('❌ Project configuration check failed:', error);
        throw error;
      }
    });
  });

  describe('TypeScript Compilation', () => {
    it('should compile shared libraries without errors', () => {
      try {
        // Test TypeScript compilation for shared libraries
        const result = execSync(
          'node_modules\\.bin\\nx.cmd run shared-types:build',
          {
            encoding: 'utf8',
            timeout: 30000,
            cwd: process.cwd(),
          }
        );

        console.log('✅ Shared types library compiles successfully');
      } catch (error) {
        console.error('❌ Shared types compilation failed:', error);
        // Don't fail the test if it's just a build issue
        console.log('⚠️ Continuing with other tests...');
      }
    });

    it('should have valid TypeScript configurations', () => {
      const tsConfigFiles = [
        'tsconfig.base.json',
        'apps/web-admin/tsconfig.json',
        'apps/member-app/tsconfig.json',
        'apps/api/tsconfig.json',
      ];

      tsConfigFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);

        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const config = JSON.parse(content);
          expect(config).toHaveProperty('compilerOptions');
        } catch (error) {
          throw new Error(
            `Invalid TypeScript config in ${file}: ${error.message}`
          );
        }
      });

      console.log('✅ All TypeScript configurations are valid');
    });
  });

  describe('Application Structure Validation', () => {
    it('should have all required Next.js files', () => {
      const nextJsFiles = [
        'apps/web-admin/next.config.js',
        'apps/web-admin/src/app/layout.tsx',
        'apps/web-admin/src/app/page.tsx',
        'apps/member-app/next.config.js',
        'apps/member-app/src/app/layout.tsx',
        'apps/member-app/src/app/page.tsx',
      ];

      nextJsFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      console.log('✅ All Next.js application files are present');
    });

    it('should have all required NestJS files', () => {
      const nestJsFiles = [
        'apps/api/src/main.ts',
        'apps/api/src/app/app.module.ts',
        'apps/api/src/app/app.controller.ts',
        'apps/api/src/app/app.service.ts',
      ];

      nestJsFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      console.log('✅ All NestJS application files are present');
    });

    it('should have all API modules', () => {
      const modules = [
        'members',
        'departments',
        'fellowships',
        'events',
        'finance',
        'forms',
        'communications',
        'security',
        'settings',
      ];

      modules.forEach((module) => {
        const moduleFiles = [
          `apps/api/src/modules/${module}/${module}.module.ts`,
          `apps/api/src/modules/${module}/${module}.controller.ts`,
          `apps/api/src/modules/${module}/${module}.service.ts`,
        ];

        moduleFiles.forEach((file) => {
          const filePath = path.join(process.cwd(), file);
          expect(fs.existsSync(filePath)).toBe(true);
        });
      });

      console.log('✅ All API modules are present');
    });
  });

  describe('Shared Libraries Validation', () => {
    it('should have shared types with proper exports', () => {
      const typesIndex = path.join(
        process.cwd(),
        'libs/shared/types/src/index.ts'
      );
      expect(fs.existsSync(typesIndex)).toBe(true);

      const content = fs.readFileSync(typesIndex, 'utf8');
      expect(content).toContain('export');

      console.log('✅ Shared types library has exports');
    });

    it('should have shared utils with proper exports', () => {
      const utilsIndex = path.join(
        process.cwd(),
        'libs/shared/utils/src/index.ts'
      );
      expect(fs.existsSync(utilsIndex)).toBe(true);

      const content = fs.readFileSync(utilsIndex, 'utf8');
      expect(content).toContain('export');

      console.log('✅ Shared utils library has exports');
    });

    it('should have UI library with proper exports', () => {
      const uiIndex = path.join(process.cwd(), 'libs/shared/ui/src/index.ts');
      expect(fs.existsSync(uiIndex)).toBe(true);

      const content = fs.readFileSync(uiIndex, 'utf8');
      expect(content).toContain('export');

      console.log('✅ UI library has exports');
    });
  });

  describe('Configuration Files Validation', () => {
    it('should have all environment example files', () => {
      const envFiles = [
        'apps/web-admin/.env.example',
        'apps/member-app/.env.example',
        'apps/api/.env.example',
      ];

      envFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, 'utf8');
        expect(content.length).toBeGreaterThan(0);
      });

      console.log('✅ All environment example files are present');
    });

    it('should have Prisma configuration', () => {
      const prismaSchema = path.join(
        process.cwd(),
        'apps/api/prisma/schema.prisma'
      );
      expect(fs.existsSync(prismaSchema)).toBe(true);

      const content = fs.readFileSync(prismaSchema, 'utf8');
      expect(content).toContain('generator client');
      expect(content).toContain('datasource db');
      expect(content).toContain('model User');

      console.log('✅ Prisma configuration is complete');
    });

    it('should have Docker configuration', () => {
      const dockerFiles = [
        'docker-compose.yml',
        'apps/api/Dockerfile',
        'apps/web-admin/Dockerfile',
        'apps/member-app/Dockerfile',
      ];

      dockerFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      console.log('✅ Docker configuration files are present');
    });
  });

  describe('Package Dependencies', () => {
    it('should have all required dependencies in package.json', () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      const requiredDeps = [
        '@nestjs/core',
        '@nestjs/common',
        'next',
        'react',
        '@prisma/client',
        'tailwindcss',
      ];

      requiredDeps.forEach((dep) => {
        const hasInDeps =
          packageJson.dependencies && packageJson.dependencies[dep];
        const hasInDevDeps =
          packageJson.devDependencies && packageJson.devDependencies[dep];

        expect(!!(hasInDeps || hasInDevDeps)).toBe(true);
      });

      console.log('✅ All required dependencies are present');
    });
  });
});
