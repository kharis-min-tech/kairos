/**
 * Build Configuration for Kairos Monorepo
 *
 * This file contains centralized build settings and optimization configurations
 * for all applications and libraries in the workspace.
 */

const buildConfig = {
  // Global build settings
  global: {
    parallel: 4,
    maxParallel: 8,
    cacheDirectory: '.nx/cache',
    outputDirectory: 'dist',
  },

  // Application-specific build settings
  applications: {
    'web-admin': {
      outputPath: 'dist/apps/web-admin',
      port: 4200,
      optimization: {
        production: true,
        development: false,
      },
    },
    'member-app': {
      outputPath: 'dist/apps/member-app',
      port: 4201,
      optimization: {
        production: true,
        development: false,
      },
    },
    api: {
      outputPath: 'dist/apps/api',
      port: 3333,
      optimization: {
        production: true,
        development: false,
      },
    },
  },

  // Library-specific build settings
  libraries: {
    'shared-types': {
      outputPath: 'dist/libs/shared/types',
    },
    'shared-utils': {
      outputPath: 'dist/libs/shared/utils',
    },
    ui: {
      outputPath: 'dist/libs/shared/ui',
    },
  },

  // Production optimization settings
  production: {
    optimization: true,
    outputHashing: 'all',
    sourceMap: false,
    namedChunks: false,
    extractLicenses: true,
    vendorChunk: false,
    minify: true,
    treeshake: true,
  },

  // Development settings
  development: {
    optimization: false,
    outputHashing: 'none',
    sourceMap: true,
    namedChunks: true,
    extractLicenses: false,
    vendorChunk: true,
    minify: false,
    treeshake: false,
  },

  // Cache settings
  cache: {
    enabled: true,
    directory: '.nx/cache',
    operations: ['build', 'lint', 'test', 'e2e', 'export'],
    runtimeInputs: ['node -v', 'npm -v'],
  },

  // Parallel execution settings
  parallel: {
    default: 4,
    max: 8,
    ci: 2, // Lower for CI environments
  },
};

module.exports = buildConfig;
