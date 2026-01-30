/**
 * Cloudflare API Client Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { CloudflareClient, CloudflareAPIError } from '../src/services/cloudflare';
import type { CloudflareConfig } from '../src/types/config';

describe('CloudflareClient', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Constructor', () => {
    it('accepts API token authentication', () => {
      const config: CloudflareConfig = {
        apiToken: 'test_token_123',
        zones: [],
      };

      const client = new CloudflareClient(config);
      expect(client).toBeInstanceOf(CloudflareClient);
    });

    it('accepts email + API key authentication', () => {
      const config: CloudflareConfig = {
        apiToken: '',
        email: 'test@example.com',
        apiKey: 'test_api_key',
        zones: [],
      };

      const client = new CloudflareClient(config);
      expect(client).toBeInstanceOf(CloudflareClient);
    });

    it('throws error without authentication', () => {
      const config: CloudflareConfig = {
        apiToken: '',
        zones: [],
      };

      expect(() => new CloudflareClient(config)).toThrow(CloudflareAPIError);
      expect(() => new CloudflareClient(config)).toThrow('Either apiToken or (email + apiKey) must be provided');
    });
  });

  describe('getDNSRecords', () => {
    const config: CloudflareConfig = {
      apiToken: 'test_token',
      zones: [],
    };

    it('fetches DNS records successfully', async () => {
      const mockRecords = [
        {
          id: 'record_1',
          type: 'A',
          name: 'example.com',
          content: '1.2.3.4',
          proxied: false,
          ttl: 300,
          created_on: '2024-01-01T00:00:00Z',
          modified_on: '2024-01-01T00:00:00Z',
        },
      ];

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: mockRecords,
        })))
      );

      const client = new CloudflareClient(config);
      const records = await client.getDNSRecords('zone_123');

      expect(records).toEqual(mockRecords);
    });

    it('fetches DNS records with filters', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: [],
        })))
      );

      const client = new CloudflareClient(config);
      await client.getDNSRecords('zone_123', { name: 'www.example.com', type: 'A' });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.cloudflare.com/client/v4/zones/zone_123/dns_records?name=www.example.com&type=A',
        expect.any(Object)
      );
    });

    it('throws CloudflareAPIError on API error', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: false,
          errors: [{ code: 1001, message: 'Invalid zone identifier' }],
          messages: [],
        }), { status: 400 }))
      );

      const client = new CloudflareClient(config);

      expect(client.getDNSRecords('invalid_zone')).rejects.toThrow(CloudflareAPIError);
    });

    it('throws CloudflareAPIError on network error', async () => {
      globalThis.fetch = mock(() => Promise.reject(new Error('Network error')));

      const client = new CloudflareClient(config);

      expect(client.getDNSRecords('zone_123')).rejects.toThrow(CloudflareAPIError);
    });
  });

  describe('updateDNSRecord', () => {
    const config: CloudflareConfig = {
      apiToken: 'test_token',
      zones: [],
    };

    it('updates DNS record successfully', async () => {
      const mockUpdatedRecord = {
        id: 'record_1',
        type: 'A',
        name: 'example.com',
        content: '5.6.7.8',
        proxied: false,
        ttl: 300,
        created_on: '2024-01-01T00:00:00Z',
        modified_on: '2024-01-02T00:00:00Z',
      };

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: mockUpdatedRecord,
        })))
      );

      const client = new CloudflareClient(config);
      const result = await client.updateDNSRecord('zone_123', 'record_1', {
        content: '5.6.7.8',
        type: 'A',
        name: 'example.com',
        ttl: 300,
        proxied: false,
      });

      expect(result).toEqual(mockUpdatedRecord);
    });

    it('throws error on update failure', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: false,
          errors: [{ code: 9109, message: 'Invalid record content' }],
          messages: [],
        }), { status: 400 }))
      );

      const client = new CloudflareClient(config);

      expect(
        client.updateDNSRecord('zone_123', 'record_1', { content: 'invalid', type: 'A' })
      ).rejects.toThrow(CloudflareAPIError);
    });
  });

  describe('getZone', () => {
    const config: CloudflareConfig = {
      apiToken: 'test_token',
      zones: [],
    };

    it('fetches zone information successfully', async () => {
      const mockZone = {
        id: 'zone_123',
        name: 'example.com',
        status: 'active',
      };

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: mockZone,
        })))
      );

      const client = new CloudflareClient(config);
      const zone = await client.getZone('zone_123');

      expect(zone).toEqual(mockZone);
    });
  });

  describe('verifyAuthentication', () => {
    const config: CloudflareConfig = {
      apiToken: 'test_token',
      zones: [],
    };

    it('verifies authentication successfully', async () => {
      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
      };

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: mockUser,
        })))
      );

      const client = new CloudflareClient(config);
      const user = await client.verifyAuthentication();

      expect(user).toEqual(mockUser);
    });

    it('throws error on invalid credentials', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: false,
          errors: [{ code: 9103, message: 'Invalid token' }],
          messages: [],
        }), { status: 401 }))
      );

      const client = new CloudflareClient(config);

      expect(client.verifyAuthentication()).rejects.toThrow(CloudflareAPIError);
    });
  });

  describe('listZones', () => {
    const config: CloudflareConfig = {
      apiToken: 'test_token',
      zones: [],
    };

    it('lists zones successfully', async () => {
      const mockZones = [
        { id: 'zone_1', name: 'example.com', status: 'active' },
        { id: 'zone_2', name: 'test.com', status: 'active' },
      ];

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: mockZones,
        })))
      );

      const client = new CloudflareClient(config);
      const zones = await client.listZones();

      expect(zones).toEqual(mockZones);
      expect(zones).toHaveLength(2);
    });
  });

  describe('findZoneId', () => {
    const config: CloudflareConfig = {
      apiToken: 'test_token',
      zones: [],
    };

    it('finds zone ID by domain name', async () => {
      const mockZones = [
        { id: 'zone_1', name: 'example.com', status: 'active' },
        { id: 'zone_2', name: 'test.com', status: 'active' },
      ];

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: mockZones,
        })))
      );

      const client = new CloudflareClient(config);
      const zoneId = await client.findZoneId('test.com');

      expect(zoneId).toBe('zone_2');
    });

    it('returns null for non-existent domain', async () => {
      const mockZones = [
        { id: 'zone_1', name: 'example.com', status: 'active' },
      ];

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: mockZones,
        })))
      );

      const client = new CloudflareClient(config);
      const zoneId = await client.findZoneId('nonexistent.com');

      expect(zoneId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    const config: CloudflareConfig = {
      apiToken: 'test_token',
      zones: [],
    };

    it('handles missing result in response', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          // No result field
        })))
      );

      const client = new CloudflareClient(config);

      expect(client.listZones()).rejects.toThrow(CloudflareAPIError);
    });

    it('preserves error status code', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({
          success: false,
          errors: [{ code: 10000, message: 'Rate limit exceeded' }],
          messages: [],
        }), { status: 429 }))
      );

      const client = new CloudflareClient(config);

      try {
        await client.listZones();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(CloudflareAPIError);
        expect((error as CloudflareAPIError).statusCode).toBe(429);
      }
    });
  });
});

describe('CloudflareAPIError', () => {
  it('creates error with message only', () => {
    const error = new CloudflareAPIError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('CloudflareAPIError');
    expect(error.statusCode).toBeUndefined();
    expect(error.errors).toBeUndefined();
  });

  it('creates error with status code', () => {
    const error = new CloudflareAPIError('Test error', 404);
    expect(error.statusCode).toBe(404);
  });

  it('creates error with errors array', () => {
    const errors = [{ code: 1001, message: 'Error 1' }];
    const error = new CloudflareAPIError('Test error', 400, errors);
    expect(error.errors).toEqual(errors);
  });
});
