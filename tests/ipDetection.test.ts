/**
 * IP Detection Service Tests
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import {
  getPublicIP,
  getPublicIPv4,
  getPublicIPv6,
  isValidIPv4,
  isValidIPv6,
  isValidIP,
  IPDetectionError
} from '../src/services/ipDetection';

describe('IP Validation', () => {
  describe('isValidIPv4', () => {
    it('accepts valid IPv4 addresses', () => {
      expect(isValidIPv4('192.168.1.1')).toBe(true);
      expect(isValidIPv4('0.0.0.0')).toBe(true);
      expect(isValidIPv4('255.255.255.255')).toBe(true);
      expect(isValidIPv4('1.2.3.4')).toBe(true);
    });

    it('rejects invalid IPv4 addresses', () => {
      expect(isValidIPv4('256.1.1.1')).toBe(false);
      expect(isValidIPv4('1.1.1.256')).toBe(false);
      expect(isValidIPv4('192.168.1')).toBe(false);
      expect(isValidIPv4('not.an.ip')).toBe(false);
      expect(isValidIPv4('')).toBe(false);
    });

    it('rejects IPv6 addresses', () => {
      expect(isValidIPv4('2001:db8::1')).toBe(false);
      expect(isValidIPv4('::1')).toBe(false);
    });
  });

  describe('isValidIPv6', () => {
    it('accepts valid IPv6 addresses', () => {
      expect(isValidIPv6('2001:db8::1')).toBe(true);
      expect(isValidIPv6('::1')).toBe(true);
      expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    });

    it('rejects invalid IPv6 addresses', () => {
      expect(isValidIPv6('not.an.ipv6')).toBe(false);
      expect(isValidIPv6('')).toBe(false);
      expect(isValidIPv6('192.168.1.1')).toBe(false); // IPv4
    });
  });

  describe('isValidIP', () => {
    it('accepts valid IPv4', () => {
      expect(isValidIP('192.168.1.1')).toBe(true);
    });

    it('accepts valid IPv6', () => {
      expect(isValidIP('2001:db8::1')).toBe(true);
    });

    it('rejects invalid IPs', () => {
      expect(isValidIP('not.an.ip')).toBe(false);
      expect(isValidIP('')).toBe(false);
    });
  });
});

describe('getPublicIPv4', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns IPv4 address from JSON provider', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ ip: '1.2.3.4' })))
    );

    const ip = await getPublicIPv4();
    expect(ip).toBe('1.2.3.4');
  });

  it('returns IPv4 address from plain text provider on fallback', async () => {
    let callCount = 0;
    globalThis.fetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Provider 1 failed'));
      }
      return Promise.resolve(new Response('5.6.7.8'));
    });

    const ip = await getPublicIPv4();
    expect(ip).toBe('5.6.7.8');
  });

  it('throws error when all providers fail', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Provider failed')));

    expect(getPublicIPv4()).rejects.toThrow(IPDetectionError);
  });
});

describe('getPublicIPv6', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns IPv6 address from provider', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ ip: '2001:db8::1' })))
    );

    const ip = await getPublicIPv6();
    expect(ip).toBe('2001:db8::1');
  });

  it('throws error when provider returns IPv4', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ ip: '1.2.3.4' })))
    );

    expect(getPublicIPv6()).rejects.toThrow('Received non-IPv6 address');
  });

  it('throws error when provider fails', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Provider failed')));

    expect(getPublicIPv6()).rejects.toThrow(IPDetectionError);
  });
});

describe('getPublicIP', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns IP from JSON provider', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ ip: '1.2.3.4' })))
    );

    const ip = await getPublicIP();
    expect(ip).toBe('1.2.3.4');
  });

  it('falls back to other providers on failure', async () => {
    let callCount = 0;
    globalThis.fetch = mock(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Provider 1 failed'));
      }
      return Promise.resolve(new Response(JSON.stringify({ ip: '5.6.7.8' })));
    });

    const ip = await getPublicIP();
    expect(ip).toBe('5.6.7.8');
  });

  it('throws error when all providers fail', async () => {
    globalThis.fetch = mock(() => Promise.reject(new Error('Provider failed')));

    expect(getPublicIP()).rejects.toThrow(IPDetectionError);
  });
});
