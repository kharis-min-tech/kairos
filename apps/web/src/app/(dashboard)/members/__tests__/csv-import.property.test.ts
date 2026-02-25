// Feature: members-module, Property 15: CSV column mapping produces correct JSON rows
// Feature: members-module, Property 16: CSV preview shows first 5 rows
// Feature: members-module, Property 18: CSV large file warning threshold
// **Validates: Requirements 10.1, 10.2, 10.5**

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Pure functions under test (extracted from import/page.tsx) ---

const REQUIRED_FIELDS = [
  'first_name', 'last_name', 'email', 'phone',
  'date_of_birth', 'gender', 'address', 'home_branch_id',
];

function applyColumnMapping(
  csvRows: string[][],
  csvHeaders: string[],
  columnMapping: Record<string, string>
): Record<string, string>[] {
  return csvRows.map((row) => {
    const obj: Record<string, string> = {};
    REQUIRED_FIELDS.forEach((field) => {
      const csvCol = columnMapping[field];
      const colIndex = csvHeaders.indexOf(csvCol);
      obj[field] = colIndex >= 0 && colIndex < row.length ? row[colIndex] : '';
    });
    return obj;
  });
}

function getPreviewRows(mappedRows: Record<string, string>[]): Record<string, string>[] {
  return mappedRows.slice(0, 5);
}

function shouldShowLargeFileWarning(rowCount: number): boolean {
  return rowCount > 500;
}

// --- Generators ---

/** Generate a simple CSV header name (alphanumeric with underscore) */
const headerArb = fc.stringMatching(/^[a-z][a-z_]{0,11}$/);

/** Generate a simple CSV cell value */
const cellValueArb = fc.stringMatching(/^[a-z0-9 ]{0,20}$/);

/**
 * Generate a valid CSV dataset: unique headers, a column mapping that maps
 * each required field to one of those headers, and data rows with matching column count.
 */
const csvDatasetArb = fc
  .integer({ min: 8, max: 15 })
  .chain((numCols) =>
    fc.tuple(
      // Generate unique headers
      fc.uniqueArray(headerArb, { minLength: numCols, maxLength: numCols }),
      // Number of data rows
      fc.integer({ min: 1, max: 30 })
    ).chain(([headers, numRows]) =>
      fc.tuple(
        fc.constant(headers),
        // Generate data rows, each with exactly numCols cells
        fc.array(
          fc.array(cellValueArb, { minLength: numCols, maxLength: numCols }),
          { minLength: numRows, maxLength: numRows }
        ),
        // Generate column mapping: pick a random header index for each required field
        fc.tuple(
          ...REQUIRED_FIELDS.map(() => fc.integer({ min: 0, max: headers.length - 1 }))
        ).map((indices) => {
          const mapping: Record<string, string> = {};
          REQUIRED_FIELDS.forEach((field, i) => {
            mapping[field] = headers[indices[i]];
          });
          return mapping;
        })
      )
    )
  )
  .map(([headers, rows, mapping]) => ({ headers, rows, mapping }));

// --- Property 15: CSV column mapping produces correct JSON rows ---

describe('Property 15: CSV column mapping produces correct JSON rows', () => {
  it('each mapped row has all REQUIRED_FIELDS as keys', () => {
    fc.assert(
      fc.property(csvDatasetArb, ({ headers, rows, mapping }) => {
        const mapped = applyColumnMapping(rows, headers, mapping);
        for (const row of mapped) {
          expect(Object.keys(row).sort()).toEqual([...REQUIRED_FIELDS].sort());
        }
      }),
      { numRuns: 100 }
    );
  });

  it('each field value matches the CSV cell at the mapped column index', () => {
    fc.assert(
      fc.property(csvDatasetArb, ({ headers, rows, mapping }) => {
        const mapped = applyColumnMapping(rows, headers, mapping);
        for (let i = 0; i < rows.length; i++) {
          for (const field of REQUIRED_FIELDS) {
            const csvCol = mapping[field];
            const colIndex = headers.indexOf(csvCol);
            const expected = colIndex >= 0 && colIndex < rows[i].length ? rows[i][colIndex] : '';
            expect(mapped[i][field]).toBe(expected);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('unmapped columns produce empty string values', () => {
    fc.assert(
      fc.property(
        csvDatasetArb,
        ({ headers, rows }) => {
          // Create a partial mapping: only map the first 4 fields
          const partialMapping: Record<string, string> = {};
          REQUIRED_FIELDS.slice(0, 4).forEach((field, i) => {
            partialMapping[field] = headers[i % headers.length];
          });
          // Leave the last 4 fields unmapped (no key in mapping)
          const mapped = applyColumnMapping(rows, headers, partialMapping);
          const unmappedFields = REQUIRED_FIELDS.slice(4);
          for (const row of mapped) {
            for (const field of unmappedFields) {
              expect(row[field]).toBe('');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});


// --- Property 16: CSV preview shows first 5 rows ---

describe('Property 16: CSV preview shows first 5 rows', () => {
  it('preview shows exactly min(N, 5) rows for any N >= 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (numRows) => {
          const mappedRows = Array.from({ length: numRows }, (_, i) => {
            const obj: Record<string, string> = {};
            REQUIRED_FIELDS.forEach((field) => {
              obj[field] = `${field}_value_${i}`;
            });
            return obj;
          });
          const preview = getPreviewRows(mappedRows);
          expect(preview.length).toBe(Math.min(numRows, 5));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('preview rows are the first rows from the mapped data', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (numRows) => {
          const mappedRows = Array.from({ length: numRows }, (_, i) => {
            const obj: Record<string, string> = {};
            REQUIRED_FIELDS.forEach((field) => {
              obj[field] = `${field}_row_${i}`;
            });
            return obj;
          });
          const preview = getPreviewRows(mappedRows);
          for (let i = 0; i < preview.length; i++) {
            expect(preview[i]).toEqual(mappedRows[i]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 18: CSV large file warning threshold ---

describe('Property 18: CSV large file warning threshold', () => {
  it('warning shown when rowCount > 500', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 501, max: 10000 }),
        (rowCount) => {
          expect(shouldShowLargeFileWarning(rowCount)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('warning NOT shown when rowCount <= 500', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        (rowCount) => {
          expect(shouldShowLargeFileWarning(rowCount)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('boundary: exactly 500 rows = no warning, 501 rows = warning', () => {
    expect(shouldShowLargeFileWarning(500)).toBe(false);
    expect(shouldShowLargeFileWarning(501)).toBe(true);
  });
});
