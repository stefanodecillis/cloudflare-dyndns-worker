/**
 * Cloudflare API v4 Client
 * Handles authentication and DNS record operations
 */

import type { CloudflareConfig } from '../types/config';

type HeadersInit = Record<string, string>;

/**
 * Error thrown by Cloudflare API operations
 */
export class CloudflareAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly errors?: Array<{ code: number; message: string }>
  ) {
    super(message);
    this.name = 'CloudflareAPIError';
  }
}

/**
 * Cloudflare DNS record
 */
export interface DNSRecord {
  id: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV';
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  created_on: string;
  modified_on: string;
}

/**
 * Cloudflare API response wrapper
 */
interface CloudflareResponse<T> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: Array<{ code: number; message: string }>;
  result?: T;
}

/**
 * Cloudflare API Client
 */
export class CloudflareClient {
  private readonly baseURL = 'https://api.cloudflare.com/client/v4';
  private readonly headers: HeadersInit;

  constructor(config: CloudflareConfig) {
    if (!config.apiToken && !(config.email && config.apiKey)) {
      throw new CloudflareAPIError(
        'Either apiToken or (email + apiKey) must be provided'
      );
    }

    this.headers = {
      'Content-Type': 'application/json',
    };

    // Use API token if available (recommended)
    if (config.apiToken) {
      (this.headers as Record<string, string>)['Authorization'] = `Bearer ${config.apiToken}`;
    }
    // Fallback to legacy email + API key auth
    else if (config.email && config.apiKey) {
      (this.headers as Record<string, string>)['X-Auth-Email'] = config.email;
      (this.headers as Record<string, string>)['X-Auth-Key'] = config.apiKey;
    }
  }

  /**
   * Make authenticated request to Cloudflare API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = (await response.json()) as CloudflareResponse<T>;

      // Check for API-level errors
      if (!data.success) {
        const errorMessages = data.errors.map((e) => e.message).join('; ');
        throw new CloudflareAPIError(
          `Cloudflare API error: ${errorMessages}`,
          response.status,
          data.errors
        );
      }

      // Check for HTTP errors
      if (!response.ok) {
        throw new CloudflareAPIError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      // Ensure result exists
      if (data.result === undefined) {
        throw new CloudflareAPIError('API returned success but no result data');
      }

      return data.result;
    } catch (error) {
      if (error instanceof CloudflareAPIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new CloudflareAPIError(`Request timeout (10s) for ${method} ${endpoint}`);
      }

      throw new CloudflareAPIError(
        `Failed to ${method} ${endpoint}: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get DNS records for a zone
   * @param zoneId Cloudflare zone ID
   * @param filters Optional filters (name, type)
   * @returns Array of DNS records
   */
  async getDNSRecords(
    zoneId: string,
    filters?: { name?: string; type?: 'A' | 'AAAA' }
  ): Promise<DNSRecord[]> {
    const params = new URLSearchParams();

    if (filters?.name) {
      params.append('name', filters.name);
    }

    if (filters?.type) {
      params.append('type', filters.type);
    }

    const query = params.toString();
    const endpoint = `/zones/${zoneId}/dns_records${query ? `?${query}` : ''}`;

    return this.request<DNSRecord[]>('GET', endpoint);
  }

  /**
   * Update a DNS record
   * @param zoneId Cloudflare zone ID
   * @param recordId DNS record ID
   * @param data Record update data
   * @returns Updated DNS record
   */
  async updateDNSRecord(
    zoneId: string,
    recordId: string,
    data: { content: string; type: 'A' | 'AAAA'; name?: string; ttl?: number; proxied?: boolean }
  ): Promise<DNSRecord> {
    const endpoint = `/zones/${zoneId}/dns_records/${recordId}`;

    // Build update payload (minimal fields)
    const updateData: {
      type: 'A' | 'AAAA';
      content: string;
      name?: string;
      ttl?: number;
      proxied?: boolean;
    } = {
      type: data.type,
      content: data.content,
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.ttl !== undefined) {
      updateData.ttl = data.ttl;
    }

    if (data.proxied !== undefined) {
      updateData.proxied = data.proxied;
    }

    return this.request<DNSRecord>('PUT', endpoint, updateData);
  }

  /**
   * Get zone information
   * @param zoneId Cloudflare zone ID
   * @returns Zone information
   */
  async getZone(zoneId: string): Promise<{ id: string; name: string; status: string }> {
    return this.request<{ id: string; name: string; status: string }>('GET', `/zones/${zoneId}`);
  }

  /**
    * Verify authentication by fetching account info
    * @returns Account information
    */
  async verifyAuthentication(): Promise<{ id: string; email: string }> {
    return this.request<{ id: string; email: string }>('GET', '/user');
  }

  /**
   * List all zones for the account
   * @returns Array of zones with id and name
   */
  async listZones(): Promise<Array<{ id: string; name: string; status: string }>> {
    const params = new URLSearchParams();
    const query = params.toString();
    const endpoint = `/zones${query ? `?${query}` : ''}`;

    return this.request<Array<{ id: string; name: string; status: string }>>('GET', endpoint);
  }

  /**
   * Find zone ID by domain name
   * @param domain Domain name to search for
   * @returns Zone ID if found, null otherwise
   */
  async findZoneId(domain: string): Promise<string | null> {
    const zones = await this.listZones();
    const zone = zones.find((z) => z.name === domain);
    return zone ? zone.id : null;
  }
}
