import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

import { AppModule } from '../app/app.module';
import { swaggerConfig } from '../config/swagger.config';

/**
 * Script to generate OpenAPI specification files in JSON and YAML formats
 *
 * Usage: ts-node apps/api/src/scripts/generate-openapi-spec.ts
 */
async function generateOpenApiSpec() {
  const app = await NestFactory.create(AppModule, { logger: false });

  // Generate OpenAPI document
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, '../../..', 'openapi');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON file
  const jsonPath = path.join(outputDir, 'openapi.json');
  fs.writeFileSync(jsonPath, JSON.stringify(document, null, 2));
  console.log(`✅ OpenAPI JSON specification generated: ${jsonPath}`);

  // Write YAML file
  const yamlPath = path.join(outputDir, 'openapi.yaml');
  const yamlContent = yaml.dump(document, { lineWidth: -1 });
  fs.writeFileSync(yamlPath, yamlContent);
  console.log(`✅ OpenAPI YAML specification generated: ${yamlPath}`);

  await app.close();

  console.log('\n📚 OpenAPI specification files generated successfully!');
  console.log(`   - JSON: ${jsonPath}`);
  console.log(`   - YAML: ${yamlPath}`);
}

generateOpenApiSpec()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error generating OpenAPI specification:', error);
    process.exit(1);
  });
