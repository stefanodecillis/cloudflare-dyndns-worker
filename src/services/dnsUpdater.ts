/**
 * DNS Update Service
 * Orchestrates IP detection and Cloudflare DNS updates with change detection
 */

import { CloudflareClient, DNSRecord } from './cloudflare';
import { getPublicIPv4, getPublicIPv6, IPDetectionError } from './ipDetection';
import type { ZoneConfig, RecordConfig } from '../types/config';

/**
 * Summary of DNS update operation
 */
export interface UpdateResult {
  zone: string;
  record: string;
  oldIP: string;
  newIP: string;
}

export interface ErrorResult {
  zone: string;
  record: string;
  error: string;
}

export interface UpdateSummary {
  updates: UpdateResult[];
  errors: ErrorResult[];
  skipped: number; // Records that didn't need updating
  total: number;
}

/**
 * DNS Update Service
 */
export class DNSUpdater {
  constructor(private readonly cloudflare: CloudflareClient) {}

  /**
   * Check and update all configured DNS records
   * @param zones Array of zone configurations
   * @returns Summary of updates performed
   */
  async checkAndUpdateDNS(zones: ZoneConfig[]): Promise<UpdateSummary> {
    const summary: UpdateSummary = {
      updates: [],
      errors: [],
      skipped: 0,
      total: 0,
    };

    for (const zone of zones) {
      await this.processZone(zone, summary);
    }

    return summary;
  }

  /**
   * Process a single zone and its records
   */
  private async processZone(zone: ZoneConfig, summary: UpdateSummary): Promise<void> {
    for (const recordConfig of zone.records) {
      summary.total++;

      try {
        const result = await this.updateRecord(zone, recordConfig);

        if (result === 'skipped') {
          summary.skipped++;
          console.log(`  ✓ ${recordConfig.name} (${recordConfig.type}): No change needed`);
        } else if (result === 'updated') {
          // Updated - summary already updated
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        summary.errors.push({
          zone: zone.domain,
          record: recordConfig.name,
          error: errorMessage,
        });
        console.error(`  ✗ ${recordConfig.name} (${recordConfig.type}): ${errorMessage}`);
      }
    }
  }

  /**
   * Update a single DNS record
   * @returns 'updated' if updated, 'skipped' if no change
   */
  private async updateRecord(zone: ZoneConfig, recordConfig: RecordConfig): Promise<'updated' | 'skipped'> {
    // Step 1: Get current public IP based on record type
    const currentIP =
      recordConfig.type === 'AAAA' ? await getPublicIPv6() : await getPublicIPv4();

    // Step 2: Get existing DNS record
    const existingRecord = await this.findDNSRecord(zone.zoneId, recordConfig);

    if (!existingRecord) {
      throw new Error(
        `DNS record '${recordConfig.name}' (${recordConfig.type}) not found in zone '${zone.domain}'`
      );
    }

    // Step 3: Compare IPs (normalize)
    const existingIP = existingRecord.content.trim().toLowerCase();
    const newIP = currentIP.trim().toLowerCase();

    if (existingIP === newIP) {
      return 'skipped';
    }

    // Step 4: Update DNS record
    const updated = await this.cloudflare.updateDNSRecord(zone.zoneId, existingRecord.id, {
      content: newIP,
      type: recordConfig.type,
      name: existingRecord.name, // Preserve existing name
      ttl: existingRecord.ttl, // Preserve existing TTL
      proxied: recordConfig.proxied !== undefined ? recordConfig.proxied : existingRecord.proxied, // Use config or preserve existing
    });

    console.log(`  ✓ ${recordConfig.name} (${recordConfig.type}): ${existingIP} → ${newIP}`);

    return 'updated';
  }

  /**
   * Find DNS record by ID or by name and type
   */
  private async findDNSRecord(
    zoneId: string,
    recordConfig: RecordConfig
  ): Promise<DNSRecord | null> {
    // If record ID is provided, fetch directly
    if (recordConfig.id) {
      const records = await this.cloudflare.getDNSRecords(zoneId);
      return records.find((r) => r.id === recordConfig.id) || null;
    }

    // Otherwise, search by name and type
    const records = await this.cloudflare.getDNSRecords(zoneId, {
      name: recordConfig.name,
      type: recordConfig.type,
    });

    // Return first match or null if not found
    return records.length > 0 ? records[0] : null;
  }
}

/**
 * Convenience function to update DNS records
 * @param cloudflare Cloudflare API client
 * @param zones Array of zone configurations
 * @returns Summary of updates
 */
export async function checkAndUpdateDNS(
  cloudflare: CloudflareClient,
  zones: ZoneConfig[]
): Promise<UpdateSummary> {
  const updater = new DNSUpdater(cloudflare);
  return updater.checkAndUpdateDNS(zones);
}

/**
 * Format update summary for logging
 */
export function formatUpdateSummary(summary: UpdateSummary): string {
  const lines = [
    '',
    '=== DNS Update Summary ===',
    `Total records: ${summary.total}`,
    `Updated: ${summary.updates.length}`,
    `Skipped (no change): ${summary.skipped}`,
    `Errors: ${summary.errors.length}`,
  ];

  if (summary.updates.length > 0) {
    lines.push('', 'Updates:');
    for (const update of summary.updates) {
      lines.push(`  ${update.record}: ${update.oldIP} → ${update.newIP}`);
    }
  }

  if (summary.errors.length > 0) {
    lines.push('', 'Errors:');
    for (const error of summary.errors) {
      lines.push(`  ${error.record}: ${error.error}`);
    }
  }

  lines.push('========================');

  return lines.join('\n');
}
