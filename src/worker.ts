/**
 * Main Worker Loop
 * Continuous worker that periodically checks and updates DNS records
 */

import type { Config } from './types/config';
import { CloudflareClient, CloudflareAPIError } from './services/cloudflare';
import { checkAndUpdateDNS, formatUpdateSummary } from './services/dnsUpdater';

/**
 * Worker state
 */
interface WorkerState {
  isRunning: boolean;
  checkCount: number;
  consecutiveErrors: number;
  lastSuccessfulCheck?: Date;
  lastCheckTime?: Date;
  lastUpdateCount?: number;
}

/**
 * Check if error is transient (should retry)
 */
function isTransientError(error: unknown): boolean {
  if (error instanceof CloudflareAPIError) {
    // Retry on 5xx errors and rate limiting
    if (error.statusCode && error.statusCode >= 500) {
      return true;
    }
    if (error.statusCode === 429) {
      return true;
    }
    return false;
  }

  // Check for network errors
  if (error instanceof Error) {
    const msg = error.message;
    // Network errors
    const networkErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    return networkErrors.some((err) => msg.includes(err));
  }

  return false;
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry non-transient errors
      if (!isTransientError(error)) {
        throw error;
      }

      // Don't wait after last attempt
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(
          `[${formatTimestamp()}] [WARN] Retry ${attempt}/${maxRetries} in ${delayMs / 1000}s: ${error instanceof Error ? error.message : String(error)}`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Format timestamp for logging
 */
function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Format time until next check
 */
function formatTimeUntilNextCheck(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Start worker loop
 * @param cloudflare Cloudflare API client
 * @param config Application configuration
 */
export function startWorker(cloudflare: CloudflareClient, config: Config): void {
  const state: WorkerState = {
    isRunning: true,
    checkCount: 0,
    consecutiveErrors: 0,
  };

  const intervalMs = config.ipCheckInterval * 1000;
  const MAX_CONSECUTIVE_ERRORS = 10;
  const STALE_SYNC_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

  // Log startup information
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           Cloudflare DynDNS Worker Starting...               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Log configuration summary
  console.log('[INFO] Configuration:');
  console.log(`[INFO]   Zones: ${config.cloudflare.zones.length}`);
  const totalRecords = config.cloudflare.zones.reduce(
    (sum: number, zone: { records: unknown[] }) => sum + zone.records.length,
    0
  );
  console.log(`[INFO]   Records: ${totalRecords}`);
  console.log(`[INFO]   Check interval: ${config.ipCheckInterval}s`);
  console.log(`[INFO]   Sync interval: ${config.syncInterval}s`);
  console.log(`[INFO]   Max consecutive errors: ${MAX_CONSECUTIVE_ERRORS}`);
  console.log('');

  /**
   * Perform a single DNS check with retry logic
   */
  async function performDNSCheck(): Promise<void> {
    if (!state.isRunning) {
      return;
    }

    state.checkCount++;
    const checkTime = new Date();
    state.lastCheckTime = checkTime;

    console.log(`[${formatTimestamp(checkTime)}] [INFO] DNS Check #${state.checkCount}`);
    console.log('---');

    try {
      // Use retry logic for DNS updates
      const summary = await retryWithBackoff(async () => {
        return await checkAndUpdateDNS(cloudflare, config.cloudflare.zones);
      }, 3);

      // Reset consecutive errors on success
      state.consecutiveErrors = 0;
      state.lastSuccessfulCheck = checkTime;

      // Update state
      state.lastUpdateCount = summary.updates.length;

      // Log detailed results
      for (const update of summary.updates) {
        console.log(
          `[${formatTimestamp()}] [INFO] ${update.zone}: ${update.record} → ${update.newIP}`
        );
      }

      // Log summary
      if (summary.errors.length > 0) {
        console.log(`[${formatTimestamp()}] [WARN] ${summary.errors.length} error(s) occurred`);
        for (const error of summary.errors) {
          console.log(
            `[${formatTimestamp()}] [WARN] ${error.zone}: ${error.record} - ${error.error}`
          );
        }
      }

      if (summary.updates.length > 0) {
        console.log(`[${formatTimestamp()}] [INFO] ${summary.updates.length} record(s) updated`);
      } else if (summary.skipped > 0) {
        console.log(`[${formatTimestamp()}] [INFO] ${summary.skipped} record(s) unchanged`);
      }

      console.log('');
    } catch (error) {
      // Increment consecutive error count
      state.consecutiveErrors++;

      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${formatTimestamp()}] [ERROR] DNS check failed: ${errorMessage}`);
      console.error(
        `[${formatTimestamp()}] [WARN] Consecutive errors: ${state.consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}`
      );
      console.error('');

      // Exit if too many consecutive errors
      if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(`[${formatTimestamp()}] [ERROR] Too many consecutive errors (${MAX_CONSECUTIVE_ERRORS}). Exiting.`);
        console.error(`[${formatTimestamp()}] [ERROR] Please check your configuration and network connectivity.`);
        handleShutdown('CRITICAL');
        return;
      }

      // Check for authentication errors (don't retry indefinitely)
      if (error instanceof CloudflareAPIError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          console.error(`[${formatTimestamp()}] [ERROR] Authentication error (${error.statusCode}). Check your Cloudflare API credentials.`);
          console.error(`[${formatTimestamp()}] [ERROR] Exiting - configuration update required.`);
          handleShutdown('AUTH_ERROR');
          return;
        }
      }
    }
  }

  /**
   * Check for stale sync health
   */
  function checkSyncHealth(): void {
    if (state.lastSuccessfulCheck) {
      const timeSinceLastSync = Date.now() - state.lastSuccessfulCheck.getTime();
      if (timeSinceLastSync > STALE_SYNC_THRESHOLD_MS) {
        const hoursSinceLastSync = Math.floor(timeSinceLastSync / (1000 * 60 * 60));
        console.warn(
          `[${formatTimestamp()}] [WARN] Warning: No successful sync for ${hoursSinceLastSync} hours`
        );
      }
    }
  }

  /**
   * Schedule next check
   */
  function scheduleNextCheck(): void {
    if (!state.isRunning) {
      return;
    }

    setTimeout(() => {
      if (state.isRunning) {
        checkSyncHealth();
        performDNSCheck().then(() => scheduleNextCheck());
      }
    }, intervalMs);

    const nextCheckTime = new Date(Date.now() + intervalMs);
    console.log(
      `[${formatTimestamp()}] [INFO] Next check in ${formatTimeUntilNextCheck(intervalMs)} (${formatTimestamp(nextCheckTime)})`
    );
  }

  /**
   * Shutdown handler
   */
  function handleShutdown(signal: string): void {
    console.log('');
    console.log(`[${formatTimestamp()}] [INFO] Received ${signal}, shutting down...`);

    state.isRunning = false;

    // Log final statistics
    console.log('');
    console.log('[INFO] Worker Statistics:');
    console.log(`[INFO]   Total checks: ${state.checkCount}`);
    console.log(`[INFO]   Successful checks: ${state.checkCount - state.consecutiveErrors}`);
    console.log(`[INFO]   Last check: ${state.lastCheckTime ? formatTimestamp(state.lastCheckTime) : 'N/A'}`);
    console.log(`[INFO]   Last success: ${state.lastSuccessfulCheck ? formatTimestamp(state.lastSuccessfulCheck) : 'N/A'}`);
    console.log(`[INFO]   Last updates: ${state.lastUpdateCount || 0}`);

    if (state.lastSuccessfulCheck) {
      const uptime = Date.now() - state.lastSuccessfulCheck.getTime();
      const uptimeMins = Math.floor(uptime / (1000 * 60));
      console.log(`[INFO]   Time since last success: ${uptimeMins} minutes`);
    }

    console.log('');
    console.log('[INFO] Worker stopped.');
    console.log('');

    process.exit(signal === 'CRITICAL' || signal === 'AUTH_ERROR' ? 1 : 0);
  }

  // Register shutdown handlers
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  // Handle uncaught errors (shouldn't happen, but safety net)
  process.on('uncaughtException', (error) => {
    console.error(`[${formatTimestamp()}] [ERROR] Uncaught exception: ${error}`);
    handleShutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason) => {
    console.error(`[${formatTimestamp()}] [ERROR] Unhandled rejection: ${reason}`);
    handleShutdown('UNHANDLED_REJECTION');
  });

  // Start with initial check
  performDNSCheck().then(() => scheduleNextCheck());
}
