/**
 * DNS Updater Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { DNSUpdater, checkAndUpdateDNS, formatUpdateSummary } from '../src/services/dnsUpdater';
import type { CloudflareClient, DNSRecord } from '../src/services/cloudflare';
import type { ZoneConfig } from '../src/types/config';

// Create mock CloudflareClient
function createMockCloudflareClient() {
  return {
    getDNSRecords: mock(() => Promise.resolve([])),
    updateDNSRecord: mock(() => Promise.resolve({})),
    getZone: mock(() => Promise.resolve({})),
    verifyAuthentication: mock(() => Promise.resolve({})),
    listZones: mock(() => Promise.resolve([])),
    findZoneId: mock(() => Promise.resolve(null)),
  } as unknown as CloudflareClient & {
    getDNSRecords: ReturnType<typeof mock>;
    updateDNSRecord: ReturnType<typeof mock>;
  };
}

// Mock IP detection module
let mockGetPublicIPv4 = mock(() => Promise.resolve('1.2.3.4'));
let mockGetPublicIPv6 = mock(() => Promise.resolve('2001:db8::1'));

// We need to mock at module level - for now we'll test the formatting functions
// and integration tests that don't require deep mocking

describe('formatUpdateSummary', () => {
  it('formats empty summary', () => {
    const summary = {
      updates: [],
      errors: [],
      skipped: 0,
      total: 0,
    };

    const output = formatUpdateSummary(summary);

    expect(output).toContain('DNS Update Summary');
    expect(output).toContain('Total records: 0');
    expect(output).toContain('Updated: 0');
    expect(output).toContain('Skipped (no change): 0');
    expect(output).toContain('Errors: 0');
  });

  it('formats summary with updates', () => {
    const summary = {
      updates: [
        { zone: 'example.com', record: 'www.example.com', oldIP: '1.2.3.4', newIP: '5.6.7.8' },
      ],
      errors: [],
      skipped: 1,
      total: 2,
    };

    const output = formatUpdateSummary(summary);

    expect(output).toContain('Total records: 2');
    expect(output).toContain('Updated: 1');
    expect(output).toContain('Skipped (no change): 1');
    expect(output).toContain('Updates:');
    expect(output).toContain('www.example.com: 1.2.3.4 → 5.6.7.8');
  });

  it('formats summary with errors', () => {
    const summary = {
      updates: [],
      errors: [
        { zone: 'example.com', record: 'broken.example.com', error: 'Record not found' },
      ],
      skipped: 0,
      total: 1,
    };

    const output = formatUpdateSummary(summary);

    expect(output).toContain('Errors: 1');
    expect(output).toContain('Errors:');
    expect(output).toContain('broken.example.com: Record not found');
  });

  it('formats summary with multiple updates and errors', () => {
    const summary = {
      updates: [
        { zone: 'example.com', record: 'www.example.com', oldIP: '1.1.1.1', newIP: '2.2.2.2' },
        { zone: 'test.com', record: 'api.test.com', oldIP: '3.3.3.3', newIP: '4.4.4.4' },
      ],
      errors: [
        { zone: 'example.com', record: 'broken.example.com', error: 'Not found' },
      ],
      skipped: 2,
      total: 5,
    };

    const output = formatUpdateSummary(summary);

    expect(output).toContain('Total records: 5');
    expect(output).toContain('Updated: 2');
    expect(output).toContain('Skipped (no change): 2');
    expect(output).toContain('Errors: 1');
  });
});

describe('DNSUpdater', () => {
  it('can be instantiated with a CloudflareClient', () => {
    const mockClient = createMockCloudflareClient();
    const updater = new DNSUpdater(mockClient);
    expect(updater).toBeInstanceOf(DNSUpdater);
  });
});

describe('checkAndUpdateDNS', () => {
  it('returns summary with correct structure', async () => {
    const mockClient = createMockCloudflareClient();
    const zones: ZoneConfig[] = [];

    const summary = await checkAndUpdateDNS(mockClient, zones);

    expect(summary).toHaveProperty('updates');
    expect(summary).toHaveProperty('errors');
    expect(summary).toHaveProperty('skipped');
    expect(summary).toHaveProperty('total');
    expect(Array.isArray(summary.updates)).toBe(true);
    expect(Array.isArray(summary.errors)).toBe(true);
  });
});
