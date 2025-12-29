# OpenAPI Specification

This directory contains the generated OpenAPI specification files for the Kairos Church Management System API.

## Files

- `openapi.json` - OpenAPI specification in JSON format
- `openapi.yaml` - OpenAPI specification in YAML format

## Generation

The OpenAPI specification is automatically generated from the NestJS controllers and DTOs using Swagger decorators.

### Manual Generation

To manually generate the specification files:

```bash
npm run openapi:generate
```

Or using Nx:

```bash
nx run api:openapi:generate
```

### Automatic Generation

The specification is automatically generated during the build process and when the API server starts.

## Documentation

The interactive API documentation is available when the API server is running:

- **Swagger UI**: http://localhost:3333/api/docs
- **ReDoc**: (to be configured in future tasks)

## Configuration

The OpenAPI configuration is defined in:
- `apps/api/src/config/swagger.config.ts` - Main configuration
- `apps/api/src/main.ts` - Bootstrap setup

## Features

- ✅ Complete OpenAPI 3.0 specification
- ✅ Interactive Swagger UI documentation
- ✅ Multiple environment server configurations
- ✅ Comprehensive API tags and descriptions
- ✅ Automatic generation from NestJS decorators
- ✅ JSON and YAML export formats
- ⏳ Enhanced with Swagger decorators (next tasks)
- ⏳ Complete data model schemas (next tasks)
- ⏳ Request/response examples (next tasks)
- ⏳ Security schemes (next tasks)

## Usage

### For Frontend Developers
Use the generated specification files to understand API contracts and generate client SDKs.

### For Backend Developers
Add Swagger decorators to controllers and DTOs to enhance the specification.

### For QA Engineers
Use the specification for automated testing and validation.

### For DevOps Engineers
Use the specification for API gateway configuration and monitoring.

## Next Steps

1. Add Swagger decorators to existing controllers
2. Enhance data model schemas with validation rules
3. Add comprehensive examples and documentation
4. Implement security schemes
5. Set up automated specification validation