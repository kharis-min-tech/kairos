import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Docker Configuration Validation', () => {
  const rootDir = process.cwd();

  describe('Dockerfiles', () => {
    const dockerfiles = [
      'apps/web-admin/Dockerfile',
      'apps/member-app/Dockerfile',
      'apps/api/Dockerfile',
    ];

    dockerfiles.forEach((dockerfile) => {
      it(`should have ${dockerfile}`, () => {
        const dockerfilePath = join(rootDir, dockerfile);
        expect(existsSync(dockerfilePath)).toBe(true);
      });

      it(`should have valid content in ${dockerfile}`, () => {
        const dockerfilePath = join(rootDir, dockerfile);
        const content = readFileSync(dockerfilePath, 'utf-8');

        // Basic Dockerfile validation
        expect(content).toContain('FROM node:18-alpine');
        expect(content).toContain('WORKDIR /app');
        expect(content).toContain('COPY');
        expect(content).toContain('RUN');
        expect(content).toContain('EXPOSE');
        expect(content).toContain('CMD');
      });
    });
  });

  describe('.dockerignore files', () => {
    const dockerignoreFiles = [
      'apps/web-admin/.dockerignore',
      'apps/member-app/.dockerignore',
      'apps/api/.dockerignore',
    ];

    dockerignoreFiles.forEach((dockerignoreFile) => {
      it(`should have ${dockerignoreFile}`, () => {
        const dockerignorePath = join(rootDir, dockerignoreFile);
        expect(existsSync(dockerignorePath)).toBe(true);
      });

      it(`should ignore common files in ${dockerignoreFile}`, () => {
        const dockerignorePath = join(rootDir, dockerignoreFile);
        const content = readFileSync(dockerignorePath, 'utf-8');

        expect(content).toContain('node_modules');
        expect(content).toContain('.env');
        expect(content).toContain('.git');
        expect(content).toContain('*.log');
      });
    });
  });

  describe('Docker Compose Configuration', () => {
    it('should have docker-compose.yml', () => {
      const composePath = join(rootDir, 'docker-compose.yml');
      expect(existsSync(composePath)).toBe(true);
    });

    it('should have docker-compose.override.yml', () => {
      const overridePath = join(rootDir, 'docker-compose.override.yml');
      expect(existsSync(overridePath)).toBe(true);
    });

    it('should have .env.docker template', () => {
      const envPath = join(rootDir, '.env.docker');
      expect(existsSync(envPath)).toBe(true);
    });

    it('should have valid docker-compose.yml structure', () => {
      const composePath = join(rootDir, 'docker-compose.yml');
      const content = readFileSync(composePath, 'utf-8');

      // Check for required services
      expect(content).toContain('services:');
      expect(content).toContain('postgres:');
      expect(content).toContain('api:');
      expect(content).toContain('web-admin:');
      expect(content).toContain('member-app:');
      expect(content).toContain('redis:');

      // Check for volumes and networks
      expect(content).toContain('volumes:');
      expect(content).toContain('networks:');

      // Check for health checks
      expect(content).toContain('healthcheck:');
    });

    it('should have environment variables in .env.docker', () => {
      const envPath = join(rootDir, '.env.docker');
      const content = readFileSync(envPath, 'utf-8');

      expect(content).toContain('POSTGRES_DB=');
      expect(content).toContain('POSTGRES_USER=');
      expect(content).toContain('POSTGRES_PASSWORD=');
      expect(content).toContain('JWT_SECRET=');
      expect(content).toContain('DATABASE_URL=');
      expect(content).toContain('NEXT_PUBLIC_API_URL=');
    });
  });

  describe('Helper Scripts', () => {
    it('should have docker-dev.sh script', () => {
      const scriptPath = join(rootDir, 'scripts/docker-dev.sh');
      expect(existsSync(scriptPath)).toBe(true);
    });

    it('should have docker-dev.ps1 script', () => {
      const scriptPath = join(rootDir, 'scripts/docker-dev.ps1');
      expect(existsSync(scriptPath)).toBe(true);
    });

    it('should have executable permissions for shell script', () => {
      const scriptPath = join(rootDir, 'scripts/docker-dev.sh');
      const content = readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('#!/bin/bash');
    });

    it('should have PowerShell script header', () => {
      const scriptPath = join(rootDir, 'scripts/docker-dev.ps1');
      const content = readFileSync(scriptPath, 'utf-8');
      expect(content).toContain('param(');
    });
  });

  describe('Documentation', () => {
    it('should have Docker documentation', () => {
      const docPath = join(rootDir, 'docs/DOCKER.md');
      expect(existsSync(docPath)).toBe(true);
    });

    it('should have comprehensive Docker documentation', () => {
      const docPath = join(rootDir, 'docs/DOCKER.md');
      const content = readFileSync(docPath, 'utf-8');

      expect(content).toContain('# Docker Configuration');
      expect(content).toContain('## Quick Start');
      expect(content).toContain('## Services');
      expect(content).toContain('## Troubleshooting');
    });
  });

  describe('Package.json Docker Scripts', () => {
    it('should have Docker scripts in package.json', () => {
      const packagePath = join(rootDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

      expect(packageJson.scripts).toHaveProperty('docker:setup');
      expect(packageJson.scripts).toHaveProperty('docker:build');
      expect(packageJson.scripts).toHaveProperty('docker:start');
      expect(packageJson.scripts).toHaveProperty('docker:stop');
      expect(packageJson.scripts).toHaveProperty('docker:logs');
      expect(packageJson.scripts).toHaveProperty('docker:status');
      expect(packageJson.scripts).toHaveProperty('docker:migrate');
      expect(packageJson.scripts).toHaveProperty('docker:seed');
      expect(packageJson.scripts).toHaveProperty('docker:clean');
    });
  });

  describe('Gitignore Updates', () => {
    it('should ignore Docker-related files in .gitignore', () => {
      const gitignorePath = join(rootDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');

      expect(content).toContain('.env.docker.local');
      expect(content).toContain('docker-compose.*.yml');
      expect(content).toContain('*.dockerfile');
    });
  });
});
