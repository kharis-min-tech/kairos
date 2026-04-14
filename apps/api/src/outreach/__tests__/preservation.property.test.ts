// Preservation Property Tests
// **Property 2: Preservation** — Existing Endpoints and Non-Buggy Flows
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**
//
// These tests MUST PASS on unfixed code — they confirm baseline behavior to preserve.
// They will be re-run after the fix to confirm no regressions.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Test 1: Existing CDK routes are present
//
// All routes that currently work in the CDK api-stack must remain present.
// This reads api-stack.ts as a string and asserts each existing route is defined.
// ============================================================================

const apiStackPath = path.resolve(
  __dirname, '..', '..', '..', '..', '..',
  'infrastructure', 'src', 'stacks', 'api-stack.ts'
);
const apiStackContent = fs.readFileSync(apiStackPath, 'utf-8');

describe('Preservation: Existing CDK routes are present', () => {
  // All existing routes that currently work and must be preserved
  const existingRoutes = [
    { method: 'POST', path: '/v1/outreach/programs', description: 'create program' },
    { method: 'GET', path: '/v1/outreach/programs', description: 'list programs' },
    { method: 'POST', path: '/v1/outreach/programs/{outreachId}/workers', description: 'register worker (CDK route)' },
    { method: 'POST', path: '/v1/souls', description: 'capture soul' },
    { method: 'GET', path: '/v1/souls', description: 'list souls' },
    { method: 'GET', path: '/v1/souls/{soulId}', description: 'get soul' },
    { method: 'POST', path: '/v1/souls/{soulId}/followups', description: 'add follow-up' },
    { method: 'PUT', path: '/v1/souls/{soulId}/status', description: 'update status' },
    { method: 'PUT', path: '/v1/souls/{soulId}/reassign', description: 'reassign' },
    { method: 'GET', path: '/v1/souls/alerts', description: 'get alerts' },
    { method: 'GET', path: '/v1/souls/conversion-funnel', description: 'conversion funnel' },
  ] as const;

  it('all existing outreach and souls CDK routes should be present in api-stack.ts', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...existingRoutes),
        (route) => {
          // Escape special regex chars in the path
          const escapedPath = route.path.replace(/[{}]/g, '\\$&');
          // Check that a route() call exists with this path in the api-stack source
          const routePattern = new RegExp(
            `route\\s*\\([^)]*'${escapedPath}'`,
            's'
          );
          expect(apiStackContent).toMatch(routePattern);
        }
      ),
      { numRuns: existingRoutes.length * 2 }
    );
  });

  // Also verify non-outreach module routes are present (members, branches, departments, etc.)
  const otherModuleRoutes = [
    '/v1/members',
    '/v1/members/{memberId}',
    '/v1/branches',
    '/v1/branches/{branchId}',
    '/v1/departments',
    '/v1/departments/{departmentId}/members',
    '/v1/fellowships',
    '/v1/fellowships/{fellowshipId}',
    '/v1/attendance/services',
    '/v1/attendance/fellowships',
    '/v1/donations',
    '/v1/donations/online',
    '/v1/donations/manual',
    '/v1/forms',
    '/v1/forms/{formId}',
    '/v1/notifications',
    '/v1/reports/dashboard/admin',
    '/v1/reports/dashboard/pastor',
  ] as const;

  it('all non-outreach module CDK routes should remain present', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...otherModuleRoutes),
        (routePath) => {
          const escapedPath = routePath.replace(/[{}]/g, '\\$&');
          const routePattern = new RegExp(
            `route\\s*\\([^)]*'${escapedPath}'`,
            's'
          );
          expect(apiStackContent).toMatch(routePattern);
        }
      ),
      { numRuns: otherModuleRoutes.length * 2 }
    );
  });
});

// ============================================================================
// Test 2: Entity interfaces exist and have required fields
//
// Verify that OutreachProgram, Soul, and FollowUp interfaces exist in
// entities.ts and have fields for ID, name, status (regardless of casing).
// ============================================================================

const entitiesPath = path.resolve(
  __dirname, '..', '..', '..', '..', '..',
  'packages', 'types', 'src', 'entities.ts'
);
const entitiesContent = fs.readFileSync(entitiesPath, 'utf-8');

/**
 * Extract field names from a TypeScript interface definition in source code.
 */
function extractInterfaceFields(source: string, interfaceName: string): string[] {
  const interfaceRegex = new RegExp(
    `export\\s+interface\\s+${interfaceName}[^{]*\\{([^}]+)\\}`,
    's'
  );
  const match = source.match(interfaceRegex);
  if (!match) return [];

  const body = match[1]!;
  const fieldRegex = /^\s+(\w+)\??:/gm;
  const fields: string[] = [];
  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(body)) !== null) {
    fields.push(fieldMatch[1]!);
  }
  return fields;
}

describe('Preservation: Entity interfaces exist and have required fields', () => {
  it('OutreachProgram interface should exist and have ID, name, status fields', () => {
    const fields = extractInterfaceFields(entitiesContent, 'OutreachProgram');
    expect(fields.length).toBeGreaterThan(0);

    // Check that some form of ID field exists (outreach_id or outreachId)
    const hasIdField = fields.some(f => /outreach.?id/i.test(f));
    expect(hasIdField).toBe(true);

    // Check that some form of name field exists (program_name or programName)
    const hasNameField = fields.some(f => /program.?name/i.test(f));
    expect(hasNameField).toBe(true);

    // Check that some form of completed/status field exists (is_completed or isCompleted)
    const hasStatusField = fields.some(f => /completed/i.test(f));
    expect(hasStatusField).toBe(true);
  });

  it('Soul interface should exist and have ID, name, status fields', () => {
    const fields = extractInterfaceFields(entitiesContent, 'Soul');
    expect(fields.length).toBeGreaterThan(0);

    // Check that some form of ID field exists (soul_id or soulId)
    const hasIdField = fields.some(f => /soul.?id/i.test(f));
    expect(hasIdField).toBe(true);

    // Check that some form of name fields exist
    const hasFirstName = fields.some(f => /first.?name/i.test(f));
    const hasLastName = fields.some(f => /last.?name/i.test(f));
    expect(hasFirstName).toBe(true);
    expect(hasLastName).toBe(true);

    // Check that status field exists
    const hasStatus = fields.some(f => f === 'status');
    expect(hasStatus).toBe(true);
  });

  it('FollowUp interface should exist and have ID, soul reference, method fields', () => {
    const fields = extractInterfaceFields(entitiesContent, 'FollowUp');
    expect(fields.length).toBeGreaterThan(0);

    // Check that some form of ID field exists (followup_id or followUpId)
    const hasIdField = fields.some(f => /follow.?up.?id/i.test(f));
    expect(hasIdField).toBe(true);

    // Check that some form of soul reference exists (soul_id or soulId)
    const hasSoulRef = fields.some(f => /soul.?id/i.test(f));
    expect(hasSoulRef).toBe(true);

    // Check that some form of contact method exists (contact_method or contactMethod)
    const hasMethod = fields.some(f => /contact.?method/i.test(f));
    expect(hasMethod).toBe(true);
  });

  it('all entity interfaces should have fields (property-based check)', () => {
    const entityNames = [
      'OutreachProgram', 'Soul', 'FollowUp',
      'Region', 'Branch', 'Member', 'Department',
      'Fellowship', 'Service', 'Donation', 'Form', 'Notification',
    ] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...entityNames),
        (entityName) => {
          const fields = extractInterfaceFields(entitiesContent, entityName);
          expect(fields.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: entityNames.length * 2 }
    );
  });
});

// ============================================================================
// Test 3: API client methods exist
//
// Import the outreach and souls objects from @kairos/api-client and verify
// that all expected methods are functions.
// ============================================================================

// Import directly from the api-client package source (no alias configured for api app)
// NOTE: outreach & souls convenience exports are not yet implemented in api-client
// These tests document the expected API surface for when they are added.
import { outreach, souls } from '../../../../../packages/api-client/src/api';

describe('Preservation: API client methods exist', () => {
  it('outreach API client should have all expected methods', () => {
    const expectedMethods = [
      'createProgram',
      'listPrograms',
      'registerWorker',
      'getProgram',
      'completeProgram',
    ] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...expectedMethods),
        (methodName) => {
          expect(typeof outreach[methodName]).toBe('function');
        }
      ),
      { numRuns: expectedMethods.length * 2 }
    );
  });

  it('souls API client should have all expected methods', () => {
    const expectedMethods = [
      'create',
      'list',
      'get',
      'addFollowup',
      'updateStatus',
      'getAlerts',
      'getConversionFunnel',
      'getFollowUpTracker',
    ] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...expectedMethods),
        (methodName) => {
          expect(typeof souls[methodName]).toBe('function');
        }
      ),
      { numRuns: expectedMethods.length * 2 }
    );
  });
});
