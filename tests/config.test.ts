/**
 * Configuration Loader Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, ConfigError } from '../src/config/index';

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
