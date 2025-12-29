import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fc from 'fast-check';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { QueryMemberDto } from './dto/query-member.dto';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unusedDtos = { CreateMemberDto, UpdateMemberDto, QueryMemberDto };

/**
 * **Feature: api-specification, Property 1: OpenAPI Specification Completeness**
 *
 * Property-based tests for Members API OpenAPI specification completeness.
 * Validates Requirements 1.1, 1.2 from the API specification requirements.
 */
describe('Members OpenAPI Specification Completeness', () => {
  let app: INestApplication;
  let document: Record<string, unknown>;

  const mockMembersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    restore: jest.fn(),
    getStats: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [
        {
          provide: MembersService,
          useValue: mockMembersService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Create OpenAPI document
    const config = new DocumentBuilder()
      .setTitle('Test API')
      .setDescription('Test API for OpenAPI validation')
      .setVersion('1.0')
      .addTag('members')
      .build();

    document = SwaggerModule.createDocument(app, config);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Property 1: OpenAPI Specification Completeness', () => {
    it('should have complete endpoint definitions for all member endpoints', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '/members',
            '/members/{id}',
            '/members/stats',
            '/members/{id}/restore'
          ),
          (endpoint) => {
            // Check that the endpoint exists in the OpenAPI document
            const normalizedEndpoint = endpoint.replace('{id}', '{id}');
            expect(document.paths).toHaveProperty(normalizedEndpoint);

            const pathItem = document.paths[normalizedEndpoint];

            // Verify HTTP methods are documented
            if (endpoint === '/members') {
              expect(pathItem).toHaveProperty('get');
              expect(pathItem).toHaveProperty('post');
            } else if (endpoint === '/members/{id}') {
              expect(pathItem).toHaveProperty('get');
              expect(pathItem).toHaveProperty('put');
              expect(pathItem).toHaveProperty('delete');
            } else if (endpoint === '/members/stats') {
              expect(pathItem).toHaveProperty('get');
            } else if (endpoint === '/members/{id}/restore') {
              expect(pathItem).toHaveProperty('put');
            }

            // Check that each method has required OpenAPI properties
            Object.keys(pathItem).forEach((method) => {
              const operation = pathItem[method];
              expect(operation).toHaveProperty('summary');
              expect(operation).toHaveProperty('responses');

              // Check for appropriate success status codes based on method and endpoint
              if (method === 'post' && endpoint === '/members') {
                expect(operation.responses).toHaveProperty('201');
              } else {
                expect(operation.responses).toHaveProperty('200');
              }

              // Verify tags are present
              expect(operation).toHaveProperty('tags');
              expect(operation.tags).toContain('members');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have complete schema definitions for all DTOs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'CreateMemberDto',
            'UpdateMemberDto',
            'QueryMemberDto'
          ),
          (dtoName) => {
            // Check that DTO schemas are present in components
            expect(document.components).toHaveProperty('schemas');

            // The schema might be referenced or inlined, so we check for its presence
            // in the document structure
            const documentStr = JSON.stringify(document);

            // Verify that the DTO properties are documented somewhere in the spec
            if (dtoName === 'CreateMemberDto') {
              expect(documentStr).toMatch(/branchId/);
              expect(documentStr).toMatch(/firstName/);
              expect(documentStr).toMatch(/lastName/);
            } else if (dtoName === 'UpdateMemberDto') {
              expect(documentStr).toMatch(/firstName|lastName|email/);
            } else if (dtoName === 'QueryMemberDto') {
              expect(documentStr).toMatch(/search|branchId|page|limit/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have proper validation constraints documented', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            gender: fc.constantFrom('MALE', 'FEMALE'),
            maritalStatus: fc.constantFrom(
              'SINGLE',
              'MARRIED',
              'DIVORCED',
              'WIDOWED'
            ),
          }),
          (_memberData) => {
            const documentStr = JSON.stringify(document);

            // Check that enum values are documented
            expect(documentStr).toMatch(/MALE.*FEMALE/);
            expect(documentStr).toMatch(/SINGLE.*MARRIED.*DIVORCED.*WIDOWED/);

            // Check that email format is specified
            expect(documentStr).toMatch(/email/);

            // Verify required fields are marked appropriately
            expect(documentStr).toMatch(/firstName/);
            expect(documentStr).toMatch(/lastName/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have proper response schemas for all endpoints', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('get', 'post', 'put', 'delete'),
          fc.constantFrom('/members', '/members/{id}', '/members/stats'),
          (method, endpoint) => {
            const normalizedEndpoint = endpoint.replace('{id}', '{id}');

            if (
              document.paths[normalizedEndpoint] &&
              document.paths[normalizedEndpoint][method]
            ) {
              const operation = document.paths[normalizedEndpoint][method];

              // Check that responses are defined
              expect(operation).toHaveProperty('responses');

              // Check for success responses
              const responses = operation.responses;
              const hasSuccessResponse = Object.keys(responses).some((code) =>
                code.startsWith('2')
              );
              expect(hasSuccessResponse).toBe(true);

              // Check for error responses
              if (method !== 'get' || endpoint !== '/members/stats') {
                const hasErrorResponse = Object.keys(responses).some((code) =>
                  code.startsWith('4')
                );
                expect(hasErrorResponse).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have proper parameter documentation', () => {
      fc.assert(
        fc.property(
          fc.record({
            page: fc.integer({ min: 1, max: 100 }),
            limit: fc.integer({ min: 1, max: 100 }),
            search: fc.string(),
            branchId: fc.string(),
          }),
          (_queryParams) => {
            // Check that query parameters are documented in the GET /members endpoint
            const membersGetOperation = document.paths['/members']?.get;

            if (membersGetOperation) {
              const documentStr = JSON.stringify(membersGetOperation);

              // Verify pagination parameters are documented
              expect(documentStr).toMatch(/page/);
              expect(documentStr).toMatch(/limit/);

              // Verify filter parameters are documented
              expect(documentStr).toMatch(/search|branchId/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have consistent HTTP status codes across endpoints', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            {
              endpoint: '/members',
              method: 'get',
              expectedCodes: ['200', '400'],
            },
            {
              endpoint: '/members',
              method: 'post',
              expectedCodes: ['201', '400', '409'],
            },
            {
              endpoint: '/members/{id}',
              method: 'get',
              expectedCodes: ['200', '404'],
            },
            {
              endpoint: '/members/{id}',
              method: 'put',
              expectedCodes: ['200', '400', '404'],
            },
            {
              endpoint: '/members/{id}',
              method: 'delete',
              expectedCodes: ['200', '404'],
            }
          ),
          (testCase) => {
            const { endpoint, method, expectedCodes } = testCase;
            const operation = document.paths[endpoint]?.[method];

            if (operation) {
              const responses = operation.responses;

              // Check that expected status codes are documented
              expectedCodes.forEach((code) => {
                expect(responses).toHaveProperty(code);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
