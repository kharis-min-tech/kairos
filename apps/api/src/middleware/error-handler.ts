import type { Context } from 'hono';
import { AppError } from '@kairos/utils';
import { logger } from '@kairos/utils';

// PostgreSQL error codes (from the 'postgres' driver)
const PG_ERROR_MESSAGES: Record<string, { status: 400 | 409; message: string }> = {
  '22001': { status: 400, message: 'A submitted value exceeds the maximum allowed length.' },
  '23505': { status: 409, message: 'This value already exists and must be unique.' },
  '23502': { status: 400, message: 'A required field is missing a value.' },
  '23503': { status: 400, message: 'The referenced item does not exist.' },
  '22003': { status: 400, message: 'A numeric value is out of the allowed range.' },
  '22007': { status: 400, message: 'An invalid date or time value was provided.' },
};

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    logger.warn(err.message, { statusCode: err.statusCode, code: err.code });
    return c.json(
      { success: false, message: err.message, code: err.code },
      err.statusCode as 400 | 401 | 403 | 404 | 409,
    );
  }

  // Surface known PostgreSQL errors with user-friendly messages
  if (err && typeof err === 'object' && 'code' in err) {
    const pgCode = (err as { code: string }).code;
    const mapped = PG_ERROR_MESSAGES[pgCode];
    if (mapped) {
      logger.warn('PostgreSQL error', { code: pgCode, message: err.message });
      return c.json({ success: false, message: mapped.message }, mapped.status);
    }
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  return c.json(
    { success: false, message: 'Something went wrong. Please try again or contact support.' },
    500,
  );
}
