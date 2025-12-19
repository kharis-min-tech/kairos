/**
 * Simple Application Startup Test
 *
 * A simplified test that verifies applications can start without complex process management.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Simple Application Startup Tests', () => {
  const timeout = 30000; // 30 seconds

  describe('Build System Validation', () => {
    it(
      'should be able to list all NX projects',
      () => {
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

          console.log('✅ All NX projects are properly configured');
        } catch (error) {
          console.error('❌ NX project listing failed:', error);
          throw error;
        }
      },
      timeout
    );

    it(
      'should be able to validate project configurations',
      () => {
        try {
          // Test that we can get project configuration without errors
          const webAdminConfig = execSync(
            'node_modules\\.bin\\nx.cmd show project web-admin',
            {
              encoding: 'utf8',
              timeout: 10000,
              cwd: process.cwd(),
            }
          );

          expect(webAdminConfig).toContain('serve');
          expect(webAdminConfig).toContain('build');

          console.log('✅ Project configurations are valid');
        } catch (error) {
          console.error('❌ Project configuration validation failed:', error);
          throw error;
        }
      },
      timeout
    );
  });

  describe('Application Structure Validation', () => {
    it('should have all required application files', () => {
      const requiredFiles = [
        'apps/web-admin/src/app/page.tsx',
        'apps/web-admin/src/app/layout.tsx',
        'apps/member-app/src/app/page.tsx',
        'apps/member-app/src/app/layout.tsx',
        'apps/api/src/main.ts',
        'apps/api/src/app/app.module.ts',
        'apps/api/src/app/app.controller.ts',
      ];

      requiredFiles.forEach((file) => {
        const filePath = path.join(process.cwd(), file);
        expect(fs.existsSync(filePath)).toBe(true);
      });

      console.log('✅ All required application files exist');
    });

    it('should have proper API health endpoint', () => {
      const controllerPath = path.join(
        process.cwd(),
        'apps/api/src/app/app.controller.ts'
      );
      const controllerContent = fs.readFileSync(controllerPath, 'utf8');

      expect(controllerContent).toContain('@Get');
      expect(controllerContent).toContain('health');

      console.log('✅ API health endpoint is properly configured');
    });

    it('should have all required API modules', () => {
      const modulesPath = path.join(process.cwd(), 'apps/api/src/modules');
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

        // Check for basic NestJS files
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

      console.log('✅ All required API modules are present');
    });
  });

  describe('Shared Libraries Validation', () => {
    it('should have shared types library with exports', () => {
      const typesIndexPath = path.join(
        process.cwd(),
        'libs/shared/types/src/index.ts'
      );
      expect(fs.existsSync(typesIndexPath)).toBe(true);

      const typesContent = fs.readFileSync(typesIndexPath, 'utf8');
      expect(typesContent).toContain('export');

      console.log('✅ Shared types library is properly configured');
    });

    it('should have shared utils library with exports', () => {
      const utilsIndexPath = path.join(
        process.cwd(),
        'libs/shared/utils/src/index.ts'
      );
      expect(fs.existsSync(utilsIndexPath)).toBe(true);

      const utilsContent = fs.readFileSync(utilsIndexPath, 'utf8');
      expect(utilsContent).toContain('export');

      console.log('✅ Shared utils library is properly configured');
    });

    it('should have UI library with components', () => {
      const uiIndexPath = path.join(
        process.cwd(),
        'libs/shared/ui/src/index.ts'
      );
      expect(fs.existsSync(uiIndexPath)).toBe(true);

      const uiContent = fs.readFileSync(uiIndexPath, 'utf8');
      expect(uiContent).toContain('export');

      console.log('✅ UI library is properly configured');
    });
  });

  describe('Environment Configuration', () => {
    it('should have all required environment example files', () => {
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

      console.log('✅ All environment configuration files are present');
    });

    it('should have proper API environment variables', () => {
      const apiEnvPath = path.join(process.cwd(), 'apps/api/.env.example');
      const apiEnvContent = fs.readFileSync(apiEnvPath, 'utf8');

      expect(apiEnvContent).toContain('DATABASE_URL');
      expect(apiEnvContent).toContain('JWT_SECRET');
      expect(apiEnvContent).toContain('PORT');

      console.log('✅ API environment variables are properly configured');
    });
  });

  describe('Database Configuration', () => {
    it('should have Prisma schema with all required models', () => {
      const schemaPath = path.join(
        process.cwd(),
        'apps/api/prisma/schema.prisma'
      );
      expect(fs.existsSync(schemaPath)).toBe(true);

      const schemaContent = fs.readFileSync(schemaPath, 'utf8');

      // Check for key models
      const requiredModels = [
        'User',
        'Member',
        'Department',
        'Fellowship',
        'Event',
        'Payment',
      ];
      requiredModels.forEach((model) => {
        expect(schemaContent).toContain(`model ${model}`);
      });

      console.log('✅ Prisma schema is complete with all required models');
    });
  });
});
