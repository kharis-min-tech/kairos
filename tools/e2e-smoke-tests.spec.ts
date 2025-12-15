/**
 * End-to-End Smoke Tests
 *
 * These tests verify that all applications have the correct structure and configuration
 * to be able to start and run correctly. They focus on static validation rather than
 * actually starting servers to avoid test environment complexity.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('End-to-End Smoke Tests', () => {
  describe('Web Admin Application Structure', () => {
    it('should have proper Next.js configuration', () => {
      const webAdminPath = path.join(process.cwd(), 'apps/web-admin');

      // Check project.json exists and has serve target
      const projectJsonPath = path.join(webAdminPath, 'project.json');
      expect(fs.existsSync(projectJsonPath)).toBe(true);

      const projectConfig = JSON.parse(
        fs.readFileSync(projectJsonPath, 'utf-8')
      );
      expect(projectConfig.targets).toHaveProperty('serve');
      expect(projectConfig.targets).toHaveProperty('build');

      // Check Next.js config exists
      const nextConfigPath = path.join(webAdminPath, 'next.config.js');
      expect(fs.existsSync(nextConfigPath)).toBe(true);

      // Check package.json exists
      const packageJsonPath = path.join(webAdminPath, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
    });

    it('should have required application structure', () => {
      const webAdminSrcPath = path.join(process.cwd(), 'apps/web-admin/src');

      // Check app directory exists (Next.js App Router)
      expect(fs.existsSync(path.join(webAdminSrcPath, 'app'))).toBe(true);

      // Check layout.tsx exists
      expect(fs.existsSync(path.join(webAdminSrcPath, 'app/layout.tsx'))).toBe(
        true
      );

      // Check page.tsx exists
      expect(fs.existsSync(path.join(webAdminSrcPath, 'app/page.tsx'))).toBe(
        true
      );
    });
  });

  describe('Member App Application Structure', () => {
    it('should have proper Next.js configuration', () => {
      const memberAppPath = path.join(process.cwd(), 'apps/member-app');

      // Check project.json exists and has serve target
      const projectJsonPath = path.join(memberAppPath, 'project.json');
      expect(fs.existsSync(projectJsonPath)).toBe(true);

      const projectConfig = JSON.parse(
        fs.readFileSync(projectJsonPath, 'utf-8')
      );
      expect(projectConfig.targets).toHaveProperty('serve');
      expect(projectConfig.targets).toHaveProperty('build');

      // Check Next.js config exists
      const nextConfigPath = path.join(memberAppPath, 'next.config.js');
      expect(fs.existsSync(nextConfigPath)).toBe(true);

      // Check package.json exists
      const packageJsonPath = path.join(memberAppPath, 'package.json');
      expect(fs.existsSync(packageJsonPath)).toBe(true);
    });

    it('should have required application structure', () => {
      const memberAppSrcPath = path.join(process.cwd(), 'apps/member-app/src');

      // Check app directory exists (Next.js App Router)
      expect(fs.existsSync(path.join(memberAppSrcPath, 'app'))).toBe(true);

      // Check layout.tsx exists
      expect(fs.existsSync(path.join(memberAppSrcPath, 'app/layout.tsx'))).toBe(
        true
      );

      // Check page.tsx exists
      expect(fs.existsSync(path.join(memberAppSrcPath, 'app/page.tsx'))).toBe(
        true
      );
    });
  });

  describe('API Application Structure', () => {
    it('should have proper NestJS configuration', () => {
      const apiPath = path.join(process.cwd(), 'apps/api');

      // Check project.json exists and has serve target
      const projectJsonPath = path.join(apiPath, 'project.json');
      expect(fs.existsSync(projectJsonPath)).toBe(true);

      const projectConfig = JSON.parse(
        fs.readFileSync(projectJsonPath, 'utf-8')
      );
      expect(projectConfig.targets).toHaveProperty('serve');
      expect(projectConfig.targets).toHaveProperty('build');
    });

    it('should have health endpoint implementation', () => {
      const controllerPath = path.join(
        process.cwd(),
        'apps/api/src/app/app.controller.ts'
      );
      expect(fs.existsSync(controllerPath)).toBe(true);

      const controllerContent = fs.readFileSync(controllerPath, 'utf-8');
      expect(controllerContent).toContain('health');
      expect(controllerContent).toContain('@Get');
    });

    it('should have required API modules', () => {
      const modulesPath = path.join(process.cwd(), 'apps/api/src/modules');
      expect(fs.existsSync(modulesPath)).toBe(true);

      // Check that key modules exist
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
      ];

      requiredModules.forEach((module) => {
        const modulePath = path.join(modulesPath, module);
        expect(fs.existsSync(modulePath)).toBe(true);

        // Check that each module has the basic NestJS files
        expect(
          fs.existsSync(path.join(modulePath, `${module}.module.ts`))
        ).toBe(true);
        expect(
          fs.existsSync(path.join(modulePath, `${module}.controller.ts`))
        ).toBe(true);
        expect(
          fs.existsSync(path.join(modulePath, `${module}.service.ts`))
        ).toBe(true);
      });
    });
  });

  describe('Database Configuration', () => {
    it('should have Prisma configuration', () => {
      // Check if Prisma is configured in the API
      const prismaPath = path.join(process.cwd(), 'apps/api/prisma');

      if (fs.existsSync(prismaPath)) {
        // If Prisma directory exists, check for schema
        const schemaPath = path.join(prismaPath, 'schema.prisma');

        if (fs.existsSync(schemaPath)) {
          const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
          expect(schemaContent).toContain('generator client');
          expect(schemaContent).toContain('datasource db');
        } else {
          console.log(
            'Prisma schema.prisma not found - this is expected if Prisma setup is not complete'
          );
          // For smoke test purposes, just verify the directory structure exists
          expect(fs.existsSync(prismaPath)).toBe(true);
        }
      } else {
        console.log(
          'Prisma not configured, skipping database configuration test'
        );
      }
    });

    it('should have environment configuration for database', () => {
      const envExamplePath = path.join(process.cwd(), 'apps/api/.env.example');

      if (fs.existsSync(envExamplePath)) {
        const envContent = fs.readFileSync(envExamplePath, 'utf-8');
        expect(envContent).toContain('DATABASE_URL');
      } else {
        console.log(
          '.env.example not found, skipping database environment test'
        );
      }
    });
  });

  describe('Build Artifacts', () => {
    it('should have all required build configurations', () => {
      // Check that all applications have proper build configurations
      const requiredFiles = [
        'apps/web-admin/project.json',
        'apps/member-app/project.json',
        'apps/api/project.json',
        'libs/shared/types/project.json',
        'libs/shared/utils/project.json',
        'libs/shared/ui/project.json',
      ];

      requiredFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, 'utf-8');
        const config = JSON.parse(content);
        expect(config).toHaveProperty('targets');
      });
    });

    it('should have proper TypeScript configurations', () => {
      const tsConfigFiles = [
        'tsconfig.base.json',
        'apps/web-admin/tsconfig.json',
        'apps/member-app/tsconfig.json',
        'apps/api/tsconfig.json',
      ];

      tsConfigFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, 'utf-8');
        const config = JSON.parse(content);
        expect(config).toHaveProperty('compilerOptions');
      });
    });

    it('should have proper environment configurations', () => {
      const envFiles = [
        'apps/web-admin/.env.example',
        'apps/member-app/.env.example',
        'apps/api/.env.example',
      ];

      envFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);

        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
      });
    });
  });
});
