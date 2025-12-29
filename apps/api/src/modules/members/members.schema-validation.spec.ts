import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fc from 'fast-check';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { QueryMemberDto } from './dto/query-member.dto';

/**
 * **Feature: api-specification, Property 2: Schema Validation Consistency**
 *
 * Property-based tests for Member schema validation consistency.
 * Validates Requirements 1.3, 2.1, 2.2, 3.4 from the API specification requirements.
 */
describe('Member Schema Validation Consistency', () => {
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
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true })
    );

    // Create OpenAPI document
    const config = new DocumentBuilder()
      .setTitle('Test API')
      .setDescription('Test API for schema validation testing')
      .setVersion('1.0')
      .addTag('members')
      .build();

    document = SwaggerModule.createDocument(app, config);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Property 2: Schema Validation Consistency', () => {
    it('should validate CreateMemberDto required fields consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            branchId: fc
              .string({ minLength: 1, maxLength: 50 })
              .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
            firstName: fc
              .string({ minLength: 1, maxLength: 50 })
              .filter((s) => /^[a-zA-Z\s'-]+$/.test(s)),
            lastName: fc
              .string({ minLength: 1, maxLength: 50 })
              .filter((s) => /^[a-zA-Z\s'-]+$/.test(s)),
            email: fc.option(fc.emailAddress().filter((e) => e.length <= 255)),
            phone: fc.option(
              fc.string().filter((s) => /^\+[1-9]\d{1,14}$/.test(s))
            ),
            gender: fc.option(fc.constantFrom('MALE', 'FEMALE')),
            maritalStatus: fc.option(
              fc.constantFrom('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')
            ),
            dateOfBirth: fc.option(
              fc
                .date({ min: new Date('1900-01-01'), max: new Date() })
                .map((d) => d.toISOString().split('T')[0])
            ),
            address: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
            occupation: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
          }),
          async (memberData) => {
            const dto = plainToClass(CreateMemberDto, memberData);
            const validationErrors = await validate(dto);

            // Valid data should pass validation
            expect(validationErrors).toHaveLength(0);

            // Verify OpenAPI schema reflects validation constraints
            const documentStr = JSON.stringify(document);
            expect(documentStr).toMatch(/branchId/);
            expect(documentStr).toMatch(/firstName/);
            expect(documentStr).toMatch(/lastName/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject CreateMemberDto with invalid required fields', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Invalid branchId
            fc.record({
              branchId: fc.oneof(
                fc.constant(''),
                fc.string().filter((s) => s.length > 50),
                fc
                  .string()
                  .filter((s) => !/^[a-zA-Z0-9_-]+$/.test(s) && s.length > 0)
              ),
              firstName: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => /^[a-zA-Z\s'-]+$/.test(s)),
              lastName: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => /^[a-zA-Z\s'-]+$/.test(s)),
            }),
            // Invalid firstName
            fc.record({
              branchId: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
              firstName: fc.oneof(
                fc.constant(''),
                fc.string().filter((s) => s.length > 50),
                fc
                  .string()
                  .filter((s) => !/^[a-zA-Z\s'-]+$/.test(s) && s.length > 0)
              ),
              lastName: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => /^[a-zA-Z\s'-]+$/.test(s)),
            }),
            // Invalid lastName
            fc.record({
              branchId: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => /^[a-zA-Z0-9_-]+$/.test(s)),
              firstName: fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => /^[a-zA-Z\s'-]+$/.test(s)),
              lastName: fc.oneof(
                fc.constant(''),
                fc.string().filter((s) => s.length > 50),
                fc
                  .string()
                  .filter((s) => !/^[a-zA-Z\s'-]+$/.test(s) && s.length > 0)
              ),
            })
          ),
          async (memberData) => {
            const dto = plainToClass(CreateMemberDto, memberData);
            const validationErrors = await validate(dto);

            // Invalid data should fail validation
            expect(validationErrors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate UpdateMemberDto optional fields consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            firstName: fc.option(
              fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => /^[a-zA-Z\s'-]+$/.test(s))
            ),
            lastName: fc.option(
              fc
                .string({ minLength: 1, maxLength: 50 })
                .filter((s) => /^[a-zA-Z\s'-]+$/.test(s))
            ),
            email: fc.option(fc.emailAddress().filter((e) => e.length <= 255)),
            phone: fc.option(
              fc.string().filter((s) => /^\+[1-9]\d{1,14}$/.test(s))
            ),
            gender: fc.option(fc.constantFrom('MALE', 'FEMALE')),
            maritalStatus: fc.option(
              fc.constantFrom('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')
            ),
            isActive: fc.option(fc.boolean()),
          }),
          async (memberData) => {
            const dto = plainToClass(UpdateMemberDto, memberData);
            const validationErrors = await validate(dto);

            // Valid optional data should pass validation
            expect(validationErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate QueryMemberDto parameters consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            search: fc.option(
              fc
                .string({ minLength: 1, maxLength: 100 })
                .filter((s) => /^[a-zA-Z0-9\s@._+-]+$/.test(s))
            ),
            branchId: fc.option(
              fc.string().filter((s) => /^[a-zA-Z0-9_-]+$/.test(s))
            ),
            gender: fc.option(fc.constantFrom('MALE', 'FEMALE')),
            maritalStatus: fc.option(
              fc.constantFrom('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')
            ),
            page: fc.option(
              fc.integer({ min: 1, max: 1000 }).map((n) => n.toString())
            ),
            limit: fc.option(
              fc.integer({ min: 1, max: 100 }).map((n) => n.toString())
            ),
            sortBy: fc.option(
              fc.constantFrom(
                'firstName',
                'lastName',
                'email',
                'createdAt',
                'updatedAt'
              )
            ),
            sortOrder: fc.option(fc.constantFrom('asc', 'desc')),
          }),
          async (queryData) => {
            const dto = plainToClass(QueryMemberDto, queryData);
            const validationErrors = await validate(dto);

            // Valid query parameters should pass validation
            expect(validationErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have consistent enum validation across all DTOs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('MALE', 'FEMALE'),
          fc.constantFrom('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'),
          async (gender, maritalStatus) => {
            // Test CreateMemberDto
            const createDto = plainToClass(CreateMemberDto, {
              branchId: 'test-branch',
              firstName: 'John',
              lastName: 'Doe',
              gender,
              maritalStatus,
            });

            const createValidationErrors = await validate(createDto);
            expect(
              createValidationErrors.filter(
                (e) => e.property === 'gender' || e.property === 'maritalStatus'
              )
            ).toHaveLength(0);

            // Test UpdateMemberDto
            const updateDto = plainToClass(UpdateMemberDto, {
              gender,
              maritalStatus,
            });

            const updateValidationErrors = await validate(updateDto);
            expect(
              updateValidationErrors.filter(
                (e) => e.property === 'gender' || e.property === 'maritalStatus'
              )
            ).toHaveLength(0);

            // Test QueryMemberDto
            const queryDto = plainToClass(QueryMemberDto, {
              gender,
              maritalStatus,
            });

            const queryValidationErrors = await validate(queryDto);
            expect(
              queryValidationErrors.filter(
                (e) => e.property === 'gender' || e.property === 'maritalStatus'
              )
            ).toHaveLength(0);

            // Verify OpenAPI schema contains the same enum values
            const documentStr = JSON.stringify(document);
            expect(documentStr).toMatch(/MALE.*FEMALE/);
            expect(documentStr).toMatch(/SINGLE.*MARRIED.*DIVORCED.*WIDOWED/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid enum values consistently', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !['MALE', 'FEMALE'].includes(s)),
          fc
            .string()
            .filter(
              (s) => !['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'].includes(s)
            ),
          async (invalidGender, invalidMaritalStatus) => {
            // Test CreateMemberDto with invalid gender
            const createDtoGender = plainToClass(CreateMemberDto, {
              branchId: 'test-branch',
              firstName: 'John',
              lastName: 'Doe',
              gender: invalidGender,
            });

            const createGenderErrors = await validate(createDtoGender);
            expect(
              createGenderErrors.some((e) => e.property === 'gender')
            ).toBe(true);

            // Test CreateMemberDto with invalid marital status
            const createDtoMarital = plainToClass(CreateMemberDto, {
              branchId: 'test-branch',
              firstName: 'John',
              lastName: 'Doe',
              maritalStatus: invalidMaritalStatus,
            });

            const createMaritalErrors = await validate(createDtoMarital);
            expect(
              createMaritalErrors.some((e) => e.property === 'maritalStatus')
            ).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
