/**
 * Cloudflare DynDNS Worker - Main Entry Point
 *
 * This worker continuously monitors your public IP address and updates
 * Cloudflare DNS records when the IP changes.
 *
 * Configuration format (RECOMMENDED):
 *   CLOUDFLARE_API_TOKEN=your_token
 *   CLOUDFLARE_RECORDS=[{"zone":"example.com","subdomain":"www","proxy":false}]
 *
 * Usage:
 *   npm run build    # Build the project
 *   npm run dev      # Build and run
 *   npm start        # Run the built application
 */

import { loadArrayConfig } from './config/index';
import { CloudflareClient } from './services/cloudflare';
import { startWorker } from './worker';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    // TEMPORARY: Log raw environment variables for debugging
    console.log('[DEBUG] === RAW ENVIRONMENT VARIABLES ===');
    console.log('[DEBUG] CLOUDFLARE_API_TOKEN:', process.env.CLOUDFLARE_API_TOKEN ? `${process.env.CLOUDFLARE_API_TOKEN.substring(0, 8)}...` : 'NOT SET');
    console.log('[DEBUG] CLOUDFLARE_RECORDS:', process.env.CLOUDFLARE_RECORDS || 'NOT SET');
    console.log('[DEBUG] IP_CHECK_INTERVAL:', process.env.IP_CHECK_INTERVAL || 'NOT SET (default: 60)');
    console.log('[DEBUG] SYNC_INTERVAL:', process.env.SYNC_INTERVAL || 'NOT SET (default: 300)');
    console.log('[DEBUG] ===================================');
    console.log('');

    // Load configuration from environment variables
    console.log('[INFO] Loading configuration...');
    console.log('[INFO] Using array configuration format (CLOUDFLARE_RECORDS)');
    console.log('');

    const config = await loadArrayConfig();

    console.log('');
    console.log('[INFO] Configuration validated successfully');
    console.log('');

    // Initialize Cloudflare API client
    console.log('[INFO] Initializing Cloudflare API client...');
    const cloudflare = new CloudflareClient(config.cloudflare);
    console.log('[INFO] Cloudflare API client initialized');
    console.log('');

    // Start the worker loop
    startWorker(cloudflare, config);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error('[ERROR] Failed to start worker:');
    console.error(`[ERROR] ${errorMessage}`);
    console.error('');
    console.error('[ERROR] Please check your configuration and try again.');
    console.error('[ERROR] Required: CLOUDFLARE_API_TOKEN and CLOUDFLARE_RECORDS');
    console.error('');
    console.error('[ERROR] Example configuration in .env:');
    console.error('[ERROR]   CLOUDFLARE_API_TOKEN=your_token_here');
    console.error('[ERROR]   CLOUDFLARE_RECORDS=[{"zone":"example.com","subdomain":"www","proxy":false}]');
    console.error('');
    console.error('[ERROR] See .env.example for full configuration reference.');
    console.error('');
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  console.error('[ERROR] Unhandled error:', error);
  process.exit(1);
});
