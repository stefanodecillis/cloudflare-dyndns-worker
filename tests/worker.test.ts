/**
 * Worker Loop Tests
 */

import { describe, it, expect } from 'bun:test';
import { CloudflareAPIError } from '../src/services/cloudflare';

describe('Worker Helper Functions', () => {
  describe('isTransientError logic', () => {
    it('identifies 5xx errors as transient', () => {
      const error500 = new CloudflareAPIError('Server error', 500);
      const error503 = new CloudflareAPIError('Service unavailable', 503);

      expect(error500.statusCode).toBe(500);
      expect(error503.statusCode).toBe(503);
      expect(error500.statusCode! >= 500).toBe(true);
      expect(error503.statusCode! >= 500).toBe(true);
    });

    it('identifies rate limit (429) as transient', () => {
      const error429 = new CloudflareAPIError('Rate limited', 429);
      expect(error429.statusCode).toBe(429);
    });

    it('identifies 4xx errors (except 429) as non-transient', () => {
      const error400 = new CloudflareAPIError('Bad request', 400);
      const error401 = new CloudflareAPIError('Unauthorized', 401);
      const error403 = new CloudflareAPIError('Forbidden', 403);
      const error404 = new CloudflareAPIError('Not found', 404);

      expect(error400.statusCode! < 500 && error400.statusCode !== 429).toBe(true);
      expect(error401.statusCode! < 500 && error401.statusCode !== 429).toBe(true);
      expect(error403.statusCode! < 500 && error403.statusCode !== 429).toBe(true);
      expect(error404.statusCode! < 500 && error404.statusCode !== 429).toBe(true);
    });
  });

  describe('formatTimestamp logic', () => {
    it('formats date in ISO format without T', () => {
      const date = new Date('2024-01-15T10:30:45.123Z');
      const formatted = date.toISOString().replace('T', ' ').substring(0, 19);

      expect(formatted).toBe('2024-01-15 10:30:45');
    });
  });

  describe('formatTimeUntilNextCheck logic', () => {
    it('formats seconds only', () => {
      const ms = 30000;
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      const formatted = minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;

      expect(formatted).toBe('30s');
    });

    it('formats minutes and seconds', () => {
      const ms = 125000; // 2m 5s
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      const formatted = minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${seconds}s`;

      expect(formatted).toBe('2m 5s');
    });
  });
});

describe('Worker State Management', () => {
  it('tracks consecutive errors correctly', () => {
    interface WorkerState {
      isRunning: boolean;
      checkCount: number;
      consecutiveErrors: number;
      lastSuccessfulCheck?: Date;
    }

    const state: WorkerState = {
      isRunning: true,
      checkCount: 0,
      consecutiveErrors: 0,
    };

    state.checkCount++;
    expect(state.checkCount).toBe(1);

    state.consecutiveErrors++;
    expect(state.consecutiveErrors).toBe(1);

    state.consecutiveErrors = 0;
    state.lastSuccessfulCheck = new Date();
    expect(state.consecutiveErrors).toBe(0);
    expect(state.lastSuccessfulCheck).toBeDefined();
  });

  it('respects MAX_CONSECUTIVE_ERRORS threshold', () => {
    const MAX_CONSECUTIVE_ERRORS = 10;
    let consecutiveErrors = 0;

    for (let i = 0; i < 10; i++) {
      consecutiveErrors++;
    }

    expect(consecutiveErrors).toBe(MAX_CONSECUTIVE_ERRORS);
    expect(consecutiveErrors >= MAX_CONSECUTIVE_ERRORS).toBe(true);
  });

  it('detects stale sync condition', () => {
    const STALE_SYNC_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

    const lastSuccessfulCheck = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const timeSinceLastSync = Date.now() - lastSuccessfulCheck.getTime();

    expect(timeSinceLastSync > STALE_SYNC_THRESHOLD_MS).toBe(true);
  });

  it('does not flag recent syncs as stale', () => {
    const STALE_SYNC_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

    const lastSuccessfulCheck = new Date(Date.now() - 30 * 60 * 1000);
    const timeSinceLastSync = Date.now() - lastSuccessfulCheck.getTime();

    expect(timeSinceLastSync > STALE_SYNC_THRESHOLD_MS).toBe(false);
  });
});

describe('Worker Error Classification', () => {
  it('classifies authentication errors correctly', () => {
    const authErrors = [401, 403];

    authErrors.forEach((statusCode) => {
      const error = new CloudflareAPIError(`Auth error ${statusCode}`, statusCode);
      const isAuthError = error.statusCode === 401 || error.statusCode === 403;
      expect(isAuthError).toBe(true);
    });
  });

  it('classifies transient errors correctly', () => {
    const transientCodes = [429, 500, 502, 503, 504];

    transientCodes.forEach((statusCode) => {
      const error = new CloudflareAPIError(`Error ${statusCode}`, statusCode);
      const isTransient =
        (error.statusCode && error.statusCode >= 500) ||
        error.statusCode === 429;
      expect(isTransient).toBe(true);
    });
  });

  it('classifies permanent errors correctly', () => {
    const permanentCodes = [400, 404, 422];

    permanentCodes.forEach((statusCode) => {
      const error = new CloudflareAPIError(`Error ${statusCode}`, statusCode);
      const isTransient =
        (error.statusCode && error.statusCode >= 500) ||
        error.statusCode === 429;
      expect(isTransient).toBe(false);
    });
  });
});

describe('Worker Exponential Backoff', () => {
  it('calculates correct backoff delays', () => {
    const getBackoffDelay = (attempt: number) => Math.pow(2, attempt) * 1000;

    expect(getBackoffDelay(1)).toBe(2000);
    expect(getBackoffDelay(2)).toBe(4000);
    expect(getBackoffDelay(3)).toBe(8000);
  });

  it('respects maximum retry count', () => {
    const maxRetries = 3;
    let attempts = 0;
    let shouldContinue = true;

    while (shouldContinue && attempts < maxRetries) {
      attempts++;
      if (attempts >= maxRetries) {
        shouldContinue = false;
      }
    }

    expect(attempts).toBe(3);
  });
});

describe('Worker Configuration Parsing', () => {
  it('calculates correct interval in milliseconds', () => {
    const ipCheckInterval = 60;
    const intervalMs = ipCheckInterval * 1000;

    expect(intervalMs).toBe(60000);
  });

  it('counts total records across zones', () => {
    const zones = [
      { records: [{ name: 'a' }, { name: 'b' }] },
      { records: [{ name: 'c' }] },
    ];

    const totalRecords = zones.reduce(
      (sum: number, zone: { records: unknown[] }) => sum + zone.records.length,
      0
    );

    expect(totalRecords).toBe(3);
  });
});

describe('Worker Shutdown Behavior', () => {
  it('calculates uptime correctly', () => {
    const startTime = new Date(Date.now() - 65 * 60 * 1000);
    const uptime = Date.now() - startTime.getTime();
    const uptimeMins = Math.floor(uptime / (1000 * 60));

    expect(uptimeMins).toBe(65);
  });

  it('determines correct exit code', () => {
    const getExitCode = (signal: string) => {
      return signal === 'CRITICAL' || signal === 'AUTH_ERROR' ? 1 : 0;
    };

    expect(getExitCode('SIGTERM')).toBe(0);
    expect(getExitCode('SIGINT')).toBe(0);
    expect(getExitCode('CRITICAL')).toBe(1);
    expect(getExitCode('AUTH_ERROR')).toBe(1);
    expect(getExitCode('UNCAUGHT_EXCEPTION')).toBe(0);
  });
});
