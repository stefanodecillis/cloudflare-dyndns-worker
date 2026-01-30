/**
 * Configuration Loader Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { loadConfig, loadArrayConfig, ConfigError } from '../src/config/index';

describe('Configuration Loader', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore environment after each test
    process.env = { ...originalEnv };
  });

  describe('Authentication', () => {
    it('loads with API token', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token_12345';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'test_zone',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);

      const config = loadConfig();
      expect(config.cloudflare.apiToken).toBe('test_token_12345');
    });

    it('loads with email and API key', () => {
      process.env.CLOUDFLARE_EMAIL = 'test@example.com';
      process.env.CLOUDFLARE_API_KEY = 'test_api_key';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'test_zone',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);

      const config = loadConfig();
      expect(config.cloudflare.email).toBe('test@example.com');
      expect(config.cloudflare.apiKey).toBe('test_api_key');
    });

    it('throws error without auth', () => {
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'test_zone',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);

      expect(() => loadConfig()).toThrow(ConfigError);
    });
  });

  describe('Zone Configuration', () => {
    it('loads single zone', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);

      const config = loadConfig();
      expect(config.cloudflare.zones).toHaveLength(1);
      expect(config.cloudflare.zones[0].zoneId).toBe('zone_123');
    });

    it('loads multiple zones', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        },
        {
          zoneId: 'zone_456',
          domain: 'test.com',
          records: [{ name: 'test.com', type: 'A' }]
        }
      ]);

      const config = loadConfig();
      expect(config.cloudflare.zones).toHaveLength(2);
    });

    it('throws error without zones', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = '';

      expect(() => loadConfig()).toThrow(ConfigError);
    });

    it('throws error on empty zones array', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = '[]';

      expect(() => loadConfig()).toThrow('non-empty array');
    });

    it('throws error on invalid zone (missing zoneId)', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);

      expect(() => loadConfig()).toThrow('zoneId is required');
    });

    it('throws error on invalid zone (missing domain)', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);

      expect(() => loadConfig()).toThrow('domain is required');
    });
  });

  describe('Record Validation', () => {
    it('loads valid records', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [
            { name: 'example.com', type: 'A' },
            { name: 'www.example.com', type: 'A' }
          ]
        }
      ]);

      const config = loadConfig();
      expect(config.cloudflare.zones[0].records).toHaveLength(2);
    });

    it('throws error on empty records array', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: []
        }
      ]);

      expect(() => loadConfig()).toThrow('records array must not be empty');
    });

    it('throws error on invalid record type', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'CNAME' }]
        }
      ]);

      expect(() => loadConfig()).toThrow("type must be 'A' or 'AAAA'");
    });

    it('loads record with optional ID', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [{ id: 'record_id', name: 'example.com', type: 'A' }]
        }
      ]);

      const config = loadConfig();
      expect(config.cloudflare.zones[0].records[0].id).toBe('record_id');
    });
  });

  describe('Intervals', () => {
    it('applies default intervals', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);

      const config = loadConfig();
      expect(config.syncInterval).toBe(300);
      expect(config.ipCheckInterval).toBe(60);
    });

    it('loads custom intervals', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);
      process.env.SYNC_INTERVAL = '600';
      process.env.IP_CHECK_INTERVAL = '120';

      const config = loadConfig();
      expect(config.syncInterval).toBe(600);
      expect(config.ipCheckInterval).toBe(120);
    });

    it('throws error on interval below minimum', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);
      process.env.SYNC_INTERVAL = '5';

      expect(() => loadConfig()).toThrow('must be at least 10 seconds');
    });
  });

  describe('JSON Parsing', () => {
    it('parses valid JSON', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = JSON.stringify([
        {
          zoneId: 'zone_123',
          domain: 'example.com',
          records: [{ name: 'example.com', type: 'A' }]
        }
      ]);

      const config = loadConfig();
      expect(config.cloudflare.zones).toHaveLength(1);
    });

    it('throws error on invalid JSON', () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_ZONES = '{invalid json}';

      expect(() => loadConfig()).toThrow(ConfigError);
      expect(() => loadConfig()).toThrow('Failed to parse CLOUDFLARE_ZONES');
    });
  });
});

describe('CLOUDFLARE_RECORDS Array Format (loadArrayConfig)', () => {
  const originalEnv = { ...process.env };
  let originalFetch: typeof fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  // Helper to mock Cloudflare API
  const mockCloudflareZones = (zones: Array<{ id: string; name: string }>) => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({
        success: true,
        errors: [],
        messages: [],
        result: zones,
      })))
    );
  };

  describe('JSON Parsing from Docker Compose', () => {
    it('parses JSON string exactly as it appears in docker-compose.yml', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      // This is exactly what YAML passes when using single quotes:
      // CLOUDFLARE_RECORDS: '[{"zone":"example.com","subdomain":"www","proxy":false}]'
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"example.com","subdomain":"www","proxy":false}]';

      mockCloudflareZones([{ id: 'zone_123', name: 'example.com' }]);

      const config = await loadArrayConfig();
      expect(config.cloudflare.zones).toHaveLength(1);
      expect(config.cloudflare.zones[0].records[0].name).toBe('www.example.com');
    });

    it('parses multiple records from single JSON string', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"example.com","subdomain":"ha-trani","proxy":false},{"zone":"example.com","subdomain":"automation","proxy":false},{"zone":"example.com","subdomain":"media","proxy":false}]';

      mockCloudflareZones([{ id: 'zone_123', name: 'example.com' }]);

      const config = await loadArrayConfig();
      expect(config.cloudflare.zones).toHaveLength(1);
      expect(config.cloudflare.zones[0].records).toHaveLength(3);
      expect(config.cloudflare.zones[0].records[0].name).toBe('ha-trani.example.com');
      expect(config.cloudflare.zones[0].records[1].name).toBe('automation.example.com');
      expect(config.cloudflare.zones[0].records[2].name).toBe('media.example.com');
    });

    it('parses real-world docker-compose config with 8 subdomains', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      // Exact format user would paste in docker-compose.yml
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"stefanodecillis.com","subdomain":"ha-trani","proxy":false},{"zone":"stefanodecillis.com","subdomain":"automation","proxy":false},{"zone":"stefanodecillis.com","subdomain":"media","proxy":false},{"zone":"stefanodecillis.com","subdomain":"jelly","proxy":false},{"zone":"stefanodecillis.com","subdomain":"immich","proxy":false},{"zone":"stefanodecillis.com","subdomain":"auth","proxy":false},{"zone":"stefanodecillis.com","subdomain":"actual","proxy":false},{"zone":"stefanodecillis.com","subdomain":"dsm","proxy":false}]';

      mockCloudflareZones([{ id: 'zone_abc', name: 'stefanodecillis.com' }]);

      const config = await loadArrayConfig();
      expect(config.cloudflare.zones).toHaveLength(1);
      expect(config.cloudflare.zones[0].records).toHaveLength(8);
      expect(config.cloudflare.zones[0].domain).toBe('stefanodecillis.com');
    });

    it('handles root domain (empty subdomain)', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"example.com","subdomain":"","proxy":false}]';

      mockCloudflareZones([{ id: 'zone_123', name: 'example.com' }]);

      const config = await loadArrayConfig();
      expect(config.cloudflare.zones[0].records[0].name).toBe('example.com');
    });

    it('handles missing subdomain field (defaults to root)', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"example.com","proxy":false}]';

      mockCloudflareZones([{ id: 'zone_123', name: 'example.com' }]);

      const config = await loadArrayConfig();
      expect(config.cloudflare.zones[0].records[0].name).toBe('example.com');
    });

    it('handles proxy:true setting', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"example.com","subdomain":"www","proxy":true}]';

      mockCloudflareZones([{ id: 'zone_123', name: 'example.com' }]);

      const config = await loadArrayConfig();
      expect(config.cloudflare.zones[0].records[0].proxied).toBe(true);
    });

    it('handles AAAA record type', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"example.com","subdomain":"ipv6","proxy":false,"type":"AAAA"}]';

      mockCloudflareZones([{ id: 'zone_123', name: 'example.com' }]);

      const config = await loadArrayConfig();
      expect(config.cloudflare.zones[0].records[0].type).toBe('AAAA');
    });
  });

  describe('Error Messages', () => {
    it('shows helpful tip when JSON parsing fails', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '{invalid json}';

      await expect(loadArrayConfig()).rejects.toThrow('Failed to parse CLOUDFLARE_RECORDS');
      await expect(loadArrayConfig()).rejects.toThrow('Tip: In docker-compose.yml, wrap JSON in single quotes');
    });

    it('shows error for empty array', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[]';

      await expect(loadArrayConfig()).rejects.toThrow('non-empty array');
    });

    it('shows error for missing zone field', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[{"subdomain":"www","proxy":false}]';

      await expect(loadArrayConfig()).rejects.toThrow('"zone" is required');
    });

    it('shows error for invalid record type', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"example.com","subdomain":"www","type":"CNAME"}]';

      await expect(loadArrayConfig()).rejects.toThrow("'A' or 'AAAA'");
    });

    it('shows error when zone not found in Cloudflare', async () => {
      process.env.CLOUDFLARE_API_TOKEN = 'test_token';
      process.env.CLOUDFLARE_RECORDS = '[{"zone":"nonexistent.com","subdomain":"www","proxy":false}]';

      mockCloudflareZones([{ id: 'zone_123', name: 'example.com' }]);

      await expect(loadArrayConfig()).rejects.toThrow("Zone 'nonexistent.com' not found");
    });
  });
});
