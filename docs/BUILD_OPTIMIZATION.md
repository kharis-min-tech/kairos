# Build Optimization Guide

This document describes the build optimization features implemented in the Kairos monorepo.

## Overview

The build optimization system provides:
- **Intelligent Caching**: NX computation caching for faster builds
- **Parallel Execution**: Multi-core build processing
- **Production Optimizations**: Minification, tree-shaking, and bundle optimization
- **Affected Builds**: Only build what changed
- **Build Artifacts Management**: Centralized output management

## Configuration Files

### nx.json
Enhanced NX configuration with:
- Parallel execution (4 cores default, 8 max)
- Comprehensive caching for build, test, lint, e2e operations
- Optimized named inputs for production builds
- Runtime cache inputs for consistent builds

### build.config.js
Centralized build configuration containing:
- Global build settings
- Application-specific configurations
- Library build settings
- Production/development optimizations
- Cache and parallel execution settings

### .nxignore
Optimizes NX workspace analysis by excluding:
- Build artifacts and cache directories
- Node modules and dependencies
- Test files and documentation (for production builds)
- Temporary and backup files

## Build Scripts

### Basic Build Commands
```bash
# Build all projects
npm run build:all

# Build all projects for production
npm run build:all:prod

# Build only applications
npm run build:apps

# Build only applications for production
npm run build:apps:prod

# Build only shared libraries
npm run build:libs

# Build individual projects
npm run build:web-admin
npm run build:member-app
npm run build:api
```

### Optimized Build Commands
```bash
# Run optimized build with advanced features
npm run build:optimize

# Run optimized production build
npm run build:optimize:prod

# Build only affected projects
npm run affected:build

# Build affected projects for production
npm run affected:build:prod
```

### Cache Management
```bash
# Warm the NX cache
npm run cache:warm

# Clean cache
npm run clean:cache

# Clean build artifacts
npm run clean:dist

# Full clean (cache + artifacts + node_modules)
npm run clean
```

### Validation
```bash
# Validate build configuration
npm run validate:build-config
```

## Advanced Build Optimization Script

The `scripts/build-optimization.js` script provides advanced build capabilities:

### Usage
```bash
# Build all projects with optimization
node scripts/build-optimization.js

# Build only libraries
node scripts/build-optimization.js libs

# Build only applications
node scripts/build-optimization.js apps

# Build affected projects only
node scripts/build-optimization.js affected

# Warm cache
node scripts/build-optimization.js cache

# Optimize existing build artifacts
node scripts/build-optimization.js optimize
```

### Features
- **Intelligent Build Ordering**: Libraries built before applications
- **Parallel Execution**: Configurable parallel processing
- **Build Artifact Optimization**: Removes source maps, optimizes bundles
- **Build Reporting**: Generates detailed build reports
- **Error Handling**: Comprehensive error reporting and recovery

## Production Optimizations

### Next.js Applications (web-admin, member-app)
- **Optimization**: Enabled for production builds
- **Output Hashing**: All files hashed for cache busting
- **Source Maps**: Disabled for production
- **License Extraction**: Enabled
- **Vendor Chunking**: Disabled for optimal bundling
- **Environment Replacement**: Production environment files

### NestJS API
- **Optimization**: Webpack optimization enabled
- **License Extraction**: Enabled
- **Package.json Generation**: For containerization
- **Environment Replacement**: Production environment files

### Shared Libraries
- **TypeScript Compilation**: Optimized for production
- **Asset Handling**: Includes documentation and styles
- **Build Outputs**: Properly configured for consumption

## Environment Configuration

Each application has environment-specific configurations:

### Development Environment
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3333',
  // ... other dev settings
};
```

### Production Environment
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.kairos.church',
  // ... other prod settings
};
```

## Caching Strategy

### What Gets Cached
- **Build Operations**: All build outputs
- **Test Results**: Test execution results
- **Lint Results**: ESLint execution results
- **E2E Results**: End-to-end test results

### Cache Inputs
- **Production Builds**: Source files excluding tests
- **Test Runs**: All source files including tests
- **Lint Runs**: Source files and ESLint configuration
- **Runtime Inputs**: Node.js and npm versions

### Cache Optimization
- **Named Inputs**: Optimized input definitions
- **Shared Globals**: Common configuration files
- **Runtime Caching**: Version-based cache invalidation

## Performance Monitoring

### Build Reports
The optimization script generates detailed build reports including:
- Build duration and timing
- Configuration used
- Success/failure status
- Artifact sizes and locations

### Metrics to Monitor
- **Build Time**: Total build duration
- **Cache Hit Rate**: Percentage of cached operations
- **Parallel Efficiency**: Resource utilization
- **Artifact Size**: Bundle sizes and optimization effectiveness

## Troubleshooting

### Common Issues

#### Slow Builds
1. Check cache hit rate: `nx report`
2. Verify parallel execution: Check `nx.json` parallel settings
3. Clean cache: `npm run clean:cache`
4. Update dependencies: `npm run update`

#### Build Failures
1. Run validation: `npm run validate:build-config`
2. Check individual project builds
3. Verify environment files exist
4. Clean and rebuild: `npm run clean && npm run build:all`

#### Cache Issues
1. Reset cache: `nx reset`
2. Check cache directory permissions
3. Verify cache configuration in `nx.json`

### Debug Mode
Enable verbose logging:
```bash
# Verbose NX output
NX_VERBOSE_LOGGING=true npm run build:all

# Debug build optimization script
DEBUG=true node scripts/build-optimization.js
```

## Best Practices

### Development Workflow
1. Use affected builds during development: `npm run affected:build`
2. Run full builds before major releases: `npm run build:all:prod`
3. Validate configuration after changes: `npm run validate:build-config`
4. Monitor build performance regularly

### CI/CD Integration
1. Use affected builds in pull requests
2. Use full production builds for releases
3. Cache NX cache directory between builds
4. Monitor build times and optimize as needed

### Maintenance
1. Regularly clean cache: `npm run clean:cache`
2. Update build configurations as needed
3. Monitor and optimize parallel execution settings
4. Review and update .nxignore patterns

## Configuration Reference

### NX Configuration Options
- `parallel`: Number of parallel processes (default: 4)
- `maxParallel`: Maximum parallel processes (default: 8)
- `cacheDirectory`: Cache storage location (default: .nx/cache)
- `cacheableOperations`: Operations to cache

### Build Configuration Options
- `optimization`: Enable/disable optimization
- `outputHashing`: File hashing strategy
- `sourceMap`: Source map generation
- `extractLicenses`: License extraction
- `vendorChunk`: Vendor chunk strategy

### Environment Variables
- `NODE_ENV`: Node.js environment
- `NX_VERBOSE_LOGGING`: Enable verbose NX logging
- `DEBUG`: Enable debug mode for scripts
- `CI`: Detect CI environment for optimizations