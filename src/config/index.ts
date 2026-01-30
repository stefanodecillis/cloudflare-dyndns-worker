/**
 * Configuration loader with validation
 * Loads and validates environment variables for DynDNS worker
 */

import type { Config, CloudflareConfig, ZoneConfig, RecordConfig, SimpleRecordConfig } from '../types/config';

/**
 * Validation error with descriptive message
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Parse boolean from string
 */
function parseBoolean(value: string | boolean | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true' || value === '1';
}

/**
 * Parse and validate sync interval (minimum: 10 seconds)
 */
function parseInterval(value: string | undefined, defaultValue: number, name: string): number {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigError(`${name} must be a valid number`);
  }

  if (parsed < 10) {
    throw new ConfigError(`${name} must be at least 10 seconds`);
  }

  return parsed;
}

/**
 * Load array configuration (RECOMMENDED format)
 * Parses CLOUDFLARE_RECORDS array format with auto zone ID resolution
 */
export async function loadArrayConfig(): Promise<Config> {
  // Import CloudflareClient here to avoid circular dependency
  const { CloudflareClient } = await import('../services/cloudflare');

  // Cloudflare authentication
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const email = process.env.CLOUDFLARE_EMAIL?.trim();
  const apiKey = process.env.CLOUDFLARE_API_KEY?.trim();

  // Require either API token OR (email + API key)
  if (!apiToken && !(email && apiKey)) {
    throw new ConfigError(
      'Either CLOUDFLARE_API_TOKEN or (CLOUDFLARE_EMAIL + CLOUDFLARE_API_KEY) must be provided'
    );
  }

  // Parse CLOUDFLARE_RECORDS array
  const recordsJson = process.env.CLOUDFLARE_RECORDS?.trim();
  if (!recordsJson) {
    throw new ConfigError('CLOUDFLARE_RECORDS environment variable is required');
  }

  let records: SimpleRecordConfig[];
  try {
    const parsed = JSON.parse(recordsJson);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new ConfigError('CLOUDFLARE_RECORDS must be a non-empty array');
    }
    records = parsed;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(
      `Failed to parse CLOUDFLARE_RECORDS: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    );
  }

  // Validate records
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record.zone || typeof record.zone !== 'string') {
      throw new ConfigError(`Record ${i + 1}: "zone" is required and must be a string`);
    }
    if (record.subdomain !== undefined && typeof record.subdomain !== 'string') {
      throw new ConfigError(`Record ${i + 1}: "subdomain" must be a string if provided`);
    }
    if (record.type && record.type !== 'A' && record.type !== 'AAAA') {
      throw new ConfigError(`Record ${i + 1}: "type" must be 'A' or 'AAAA'`);
    }
  }

  // Initialize Cloudflare client to resolve zone IDs
  console.log('[INFO] Fetching zones from Cloudflare...');
  const cloudflare = new CloudflareClient({
    apiToken: apiToken || '',
    email,
    apiKey,
    zones: [], // Temporary empty zones
  });

  const allZones = await cloudflare.listZones();
  console.log(`[INFO] Found ${allZones.length} zone(s) in your Cloudflare account`);

  // Group records by zone
  const zoneMap = new Map<string, ZoneConfig>();

  for (const record of records) {
    const zoneName = record.zone;
    const subdomain = record.subdomain || '';
    const recordType = record.type || 'A';
    const proxied = parseBoolean(record.proxy, false);

    // Find zone ID
    const zone = allZones.find((z) => z.name === zoneName);
    if (!zone) {
      throw new ConfigError(
        `Zone '${zoneName}' not found in your Cloudflare account. Available zones: ${allZones.map((z) => z.name).join(', ')}`
      );
    }

    // Build record name
    const recordName = subdomain ? `${subdomain}.${zoneName}` : zoneName;

    // Get or create zone config
    if (!zoneMap.has(zoneName)) {
      zoneMap.set(zoneName, {
        zoneId: zone.id,
        domain: zoneName,
        records: [],
      });
    }

    // Add record to zone
    zoneMap.get(zoneName)!.records.push({
      name: recordName,
      type: recordType,
      proxied,
    });
  }

  const zones = Array.from(zoneMap.values());

  // Log configuration summary
  console.log('[INFO] Configuration loaded:');
  for (const zone of zones) {
    console.log(`[INFO]   Zone: ${zone.domain} (${zone.zoneId})`);
    for (const record of zone.records) {
      console.log(`[INFO]     - ${record.name} (${record.type}, proxied: ${record.proxied || false})`);
    }
  }

  // Parse intervals
  const syncInterval = parseInterval(
    process.env.SYNC_INTERVAL,
    300, // 5 minutes default
    'SYNC_INTERVAL'
  );

  const ipCheckInterval = parseInterval(
    process.env.IP_CHECK_INTERVAL,
    60, // 1 minute default
    'IP_CHECK_INTERVAL'
  );

  return {
    cloudflare: {
      apiToken: apiToken || '',
      email,
      apiKey,
      zones,
    },
    syncInterval,
    ipCheckInterval,
  };
}

/**
 * Validate configuration (useful for testing)
 */
export function validateConfig(config: Config): void {
  if (!config.cloudflare.apiToken && !(config.cloudflare.email && config.cloudflare.apiKey)) {
    throw new ConfigError('Invalid Cloudflare authentication configuration');
  }

  if (!config.cloudflare.zones || config.cloudflare.zones.length === 0) {
    throw new ConfigError('At least one zone must be configured');
  }

  if (config.syncInterval < 10) {
    throw new ConfigError('SYNC_INTERVAL must be at least 10 seconds');
  }

  if (config.ipCheckInterval < 10) {
    throw new ConfigError('IP_CHECK_INTERVAL must be at least 10 seconds');
  }
}
