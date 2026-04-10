import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger, createLogger } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should log structured JSON to console', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new Logger('test-service');

    logger.info('Test message');

    expect(spy).toHaveBeenCalledOnce();
    const logEntry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logEntry.level).toBe('info');
    expect(logEntry.message).toBe('Test message');
    expect(logEntry.service).toBe('test-service');
    expect(logEntry.timestamp).toBeDefined();
  });

  it('should include context in log entries', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new Logger('test-service');
    logger.setContext({ userId: 42, branchId: 5, operation: 'members-create' });

    logger.info('Member created');

    const logEntry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logEntry.userId).toBe(42);
    expect(logEntry.branchId).toBe(5);
    expect(logEntry.operation).toBe('members-create');
  });

  it('should include additional data in log entries', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new Logger('test-service');

    logger.info('Member created', { memberId: 123 });

    const logEntry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logEntry.memberId).toBe(123);
  });

  it('should use correct console methods for each level', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const logger = new Logger('test', { minLevel: 'debug' });

    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(debugSpy).toHaveBeenCalledOnce();
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it('should skip logs below minimum level', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const logger = new Logger('test', { minLevel: 'info' });

    logger.debug('should be skipped');
    logger.info('should be logged');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledOnce();
  });

  it('should include error details in error logs', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new Logger('test');

    const err = new Error('Something failed');
    logger.error('Operation failed', err);

    const logEntry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logEntry.errorName).toBe('Error');
    expect(logEntry.errorMessage).toBe('Something failed');
    expect(logEntry.stack).toBeDefined();
  });

  it('should create child logger with inherited context', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const parent = new Logger('test');
    parent.setContext({ userId: 1 });

    const child = parent.child({ operation: 'child-op' });
    child.info('Child log');

    const logEntry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logEntry.userId).toBe(1);
    expect(logEntry.operation).toBe('child-op');
  });
});

describe('createLogger', () => {
  it('should create a logger with service name', () => {
    vi.restoreAllMocks();
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('my-lambda');

    log.info('Hello');

    expect(spy).toHaveBeenCalledOnce();
    const logEntry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logEntry.service).toBe('my-lambda');
  });

  it('should create a logger with initial context', () => {
    vi.restoreAllMocks();
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = createLogger('my-lambda', { branchId: 3 });

    log.info('Hello');

    expect(spy).toHaveBeenCalledOnce();
    const logEntry = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(logEntry.branchId).toBe(3);
  });
});
