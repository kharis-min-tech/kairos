// Bug Condition Exploration Property Tests
// **Property 1: Fault Condition** — Field Name Mismatch & Missing CDK Routes
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
//
// These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
// DO NOT attempt to fix the test or the code when it fails.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Condition A: Field Name Mismatch
//
// The @kairos/types entity interfaces declare snake_case fields (outreach_id,
// soul_id, program_name, etc.) but Drizzle ORM returns camelCase (outreachId,
// soulId, programName, etc.). When the frontend casts API responses to these
// types and accesses the declared field names, it gets `undefined`.
//
// We verify this by reading the entities.ts source file and checking that
// the OutreachProgram and Soul interfaces declare camelCase field names
// matching the Drizzle schema.
// ============================================================================

const entitiesPath = path.resolve(
  __dirname, '..', '..', '..', '..', '..',
  'packages', 'types', 'src', 'entities.ts'
);
const entitiesContent = fs.readFileSync(entitiesPath, 'utf-8');

/**
 * Extract field names from a TypeScript interface definition in source code.
 * Looks for `interface Name ... { field1: type; field2: type; }` and returns field names.
 */
function extractInterfaceFields(source: string, interfaceName: string): string[] {
  // Try matching an interface with extends
  const extendsRegex = new RegExp(
    `export\\s+interface\\s+${interfaceName}\\s+extends\\s+(\\w+)[^{]*\\{([^}]+)\\}`,
    's'
  );
  const extendsMatch = source.match(extendsRegex);

  let fields: string[] = [];

  if (extendsMatch) {
    const parentName = extendsMatch[1]!;
    const body = extendsMatch[2]!;
    // Recursively get parent fields
    fields = extractInterfaceFields(source, parentName);
    // Extract own fields
    const fieldRegex = /^\s+(\w+)\??:/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.push(fieldMatch[1]!);
    }
  } else {
    // Try without extends
    const simpleRegex = new RegExp(
      `export\\s+interface\\s+${interfaceName}[^{]*\\{([^}]+)\\}`,
      's'
    );
    const simpleMatch = source.match(simpleRegex);
    if (!simpleMatch) return [];
    const body = simpleMatch[1]!;
    const fieldRegex = /^\s+(\w+)\??:/gm;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields.push(fieldMatch[1]!);
    }
  }

  return fields;
}

describe('Condition A: Field Name Mismatch — OutreachProgram type vs Drizzle output', () => {
  const programFields = extractInterfaceFields(entitiesContent, 'OutreachProgram');

  it('OutreachProgram interface should declare camelCase field names matching Drizzle schema', () => {
    // Drizzle schema defines these camelCase column names for outreach_programs:
    // outreachId, branchId, programName, programDate, location, address, city,
    // description, coordinatorId, totalSoulsReached, notes, isCompleted, createdAt, updatedAt
    //
    // On UNFIXED code: the interface has outreach_id, branch_id, program_name, etc.
    // On FIXED code: the interface has outreachId, branchId, programName, etc.

    fc.assert(
      fc.property(
        fc.constantFrom(
          'outreachId', 'branchId', 'programName', 'programDate',
          'isCompleted', 'totalSoulsReached', 'createdAt', 'updatedAt'
        ),
        (expectedCamelCaseField) => {
          expect(programFields).toContain(expectedCamelCaseField);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('OutreachProgram interface should NOT have snake_case field names', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'outreach_id', 'branch_id', 'program_name', 'program_date',
          'is_completed', 'total_souls_reached', 'created_at', 'updated_at'
        ),
        (snakeCaseField) => {
          expect(programFields).not.toContain(snakeCaseField);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('URL construction with OutreachProgram ID should produce valid paths', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.boolean(),
        fc.integer({ min: 0, max: 5000 }),
        (outreachId, branchId, programName, isCompleted, totalSoulsReached) => {
          // Simulate Drizzle ORM output (camelCase keys)
          const drizzleOutput: Record<string, unknown> = {
            outreachId,
            branchId,
            programName,
            programDate: '2024-06-15',
            location: 'Test Location',
            isCompleted,
            totalSoulsReached,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // The frontend accesses the ID using the type's declared field name.
          // Find which field name the type declares for the ID.
          const idFieldName = programFields.find(f =>
            f === 'outreachId' || f === 'outreach_id'
          );
          expect(idFieldName).toBeDefined();

          // Access the ID using the type's declared field name
          const idValue = drizzleOutput[idFieldName!];

          // On UNFIXED code: idFieldName is 'outreach_id' but drizzleOutput
          // has 'outreachId' → idValue is undefined → URL contains 'undefined'
          // On FIXED code: idFieldName is 'outreachId' → idValue is a UUID string
          expect(idValue).not.toBeUndefined();
          expect(typeof idValue).toBe('string');

          const url = `/v1/outreach/programs/${idValue}/complete`;
          expect(url).not.toContain('undefined');
          expect(url).not.toContain('NaN');
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Condition A: Field Name Mismatch — Soul type vs Drizzle output', () => {
  const soulFields = extractInterfaceFields(entitiesContent, 'Soul');

  it('Soul interface should declare camelCase field names matching Drizzle schema', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'soulId', 'firstName', 'lastName', 'assignedMemberId',
          'createdAt', 'updatedAt'
        ),
        (expectedCamelCaseField) => {
          expect(soulFields).toContain(expectedCamelCaseField);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Soul interface should NOT have snake_case field names', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'soul_id', 'first_name', 'last_name', 'assigned_member_id',
          'capture_date', 'created_at', 'updated_at'
        ),
        (snakeCaseField) => {
          expect(soulFields).not.toContain(snakeCaseField);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('URL construction with Soul ID should produce valid paths', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
        fc.constantFrom('New', 'Following Up', 'Interested', 'Not Interested', 'Converted'),
        (soulId, firstName, lastName, status) => {
          const drizzleOutput: Record<string, unknown> = {
            soulId,
            firstName,
            lastName,
            phone: '07700900000',
            status,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const idFieldName = soulFields.find(f =>
            f === 'soulId' || f === 'soul_id'
          );
          expect(idFieldName).toBeDefined();

          const idValue = drizzleOutput[idFieldName!];
          expect(idValue).not.toBeUndefined();
          expect(typeof idValue).toBe('string');

          const url = `/v1/souls/${idValue}/status`;
          expect(url).not.toContain('undefined');
          expect(url).not.toContain('NaN');
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================================================
// Condition B: Missing/Mismatched CDK Routes
//
// The api-stack.ts should define routes for:
//   - GET /v1/outreach/programs/{outreachId} (individual program)
//   - PUT /v1/outreach/programs/{outreachId}/complete
//   - GET /v1/souls/follow-up-tracker
//   - POST with path /register-worker (currently CDK has /workers — mismatch)
// On UNFIXED code: these routes are missing or have wrong paths.
// ============================================================================
describe('Condition B: Missing/Mismatched CDK Routes', () => {
  const apiStackPath = path.resolve(
    __dirname, '..', '..', '..', '..', '..',
    'infrastructure', 'src', 'stacks', 'api-stack.ts'
  );
  const apiStackContent = fs.readFileSync(apiStackPath, 'utf-8');

  it('should have a GET route for individual program retrieval: /v1/outreach/programs/{outreachId}', () => {
    // Must have a route() call with GET and path /v1/outreach/programs/{outreachId}
    // Distinct from the list route GET /v1/outreach/programs (no path param)
    const hasGetProgramRoute =
      /route\s*\([^)]*GET[^)]*'\/v1\/outreach\/programs\/\{outreachId\}'[^)]*\)/s.test(apiStackContent)
      || /route\s*\([^)]*'\/v1\/outreach\/programs\/\{outreachId\}'[^)]*GET[^)]*\)/s.test(apiStackContent);
    expect(hasGetProgramRoute).toBe(true);
  });

  it('should have a PUT route for program completion: /v1/outreach/programs/{outreachId}/complete', () => {
    const hasCompleteRoute =
      /route\s*\([^)]*'\/v1\/outreach\/programs\/\{outreachId\}\/complete'/s.test(apiStackContent);
    expect(hasCompleteRoute).toBe(true);
  });

  it('should have a GET route for follow-up tracker: /v1/souls/follow-up-tracker', () => {
    const hasFollowUpTrackerRoute =
      /route\s*\([^)]*'\/v1\/souls\/follow-up-tracker'/s.test(apiStackContent);
    expect(hasFollowUpTrackerRoute).toBe(true);
  });

  it('should have aligned register-worker path between CDK and API client', () => {
    // The fix aligned the API client to use /workers to match the CDK route.
    // Verify CDK has /workers route
    const hasCdkWorkersRoute =
      /route\s*\([^)]*'\/v1\/outreach\/programs\/\{outreachId\}\/workers'/s.test(apiStackContent);
    expect(hasCdkWorkersRoute).toBe(true);

    // Verify API client also uses /workers (not /register-worker)
    const apiClientPath = path.resolve(
      __dirname, '..', '..', '..', '..', '..',
      'packages', 'api-client', 'src', 'api.ts'
    );
    const apiClientContent = fs.readFileSync(apiClientPath, 'utf-8');
    const usesWorkersPath = apiClientContent.includes('/workers');
    const usesRegisterWorkerPath = /\/register-worker/.test(apiClientContent);
    expect(usesWorkersPath).toBe(true);
    expect(usesRegisterWorkerPath).toBe(false);
  });
});
