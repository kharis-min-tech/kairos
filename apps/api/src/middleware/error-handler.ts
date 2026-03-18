import type { Context } from 'hono';
import { AppError } from '@kairos/utils';
import { logger } from '@kairos/utils';

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    logger.warn(err.message, { statusCode: err.statusCode, code: err.code });
    return c.json(
      { success: false, message: err.message, code: err.code },
      err.statusCode as 400 | 401 | 403 | 404 | 409,
    );
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack });
  return c.json(
    { success: false, message: 'Internal server error' },
    500,
  );
}
