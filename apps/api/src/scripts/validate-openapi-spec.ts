import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app/app.module';
import { swaggerConfig } from '../config/swagger.config';

/**
 * Script to validate the OpenAPI specification
 *
 * Usage: ts-node apps/api/src/scripts/validate-openapi-spec.ts
 */
async function validateOpenApiSpec() {
  console.log('🔍 Validating OpenAPI specification...\n');

  try {
    const app = await NestFactory.create(AppModule, { logger: false });

    // Generate OpenAPI document
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    // Basic validation checks
    const validationResults = {
      hasOpenApiVersion: !!document.openapi,
      hasInfo: !!document.info,
      hasTitle: !!document.info?.title,
      hasVersion: !!document.info?.version,
      hasDescription: !!document.info?.description,
      hasContact: !!document.info?.contact,
      hasLicense: !!document.info?.license,
      hasServers: !!document.servers && document.servers.length > 0,
      hasTags: !!document.tags && document.tags.length > 0,
      hasPaths: !!document.paths && Object.keys(document.paths).length > 0,
      hasComponents: !!document.components,
    };

    // Display validation results
    console.log('📋 Validation Results:');
    console.log('=====================');

    Object.entries(validationResults).forEach(([check, passed]) => {
      const status = passed ? '✅' : '❌';
      const checkName = check.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${status} ${checkName}`);
    });

    // Summary statistics
    const passedChecks =
      Object.values(validationResults).filter(Boolean).length;
    const totalChecks = Object.keys(validationResults).length;
    const passRate = Math.round((passedChecks / totalChecks) * 100);

    console.log('\n📊 Summary:');
    console.log('===========');
    console.log(`Passed: ${passedChecks}/${totalChecks} (${passRate}%)`);

    if (document.paths) {
      const pathCount = Object.keys(document.paths).length;
      console.log(`Endpoints: ${pathCount}`);
    }

    if (document.tags) {
      console.log(`Tags: ${document.tags.length}`);
    }

    if (document.servers) {
      console.log(`Servers: ${document.servers.length}`);
    }

    await app.close();

    if (passedChecks === totalChecks) {
      console.log('\n🎉 OpenAPI specification is valid!');
      process.exit(0);
    } else {
      console.log('\n⚠️  OpenAPI specification has validation issues.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error validating OpenAPI specification:', error);
    process.exit(1);
  }
}

validateOpenApiSpec();
