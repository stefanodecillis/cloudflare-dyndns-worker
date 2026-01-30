/**
 * Configuration type definitions for Cloudflare DynDNS Worker
 */

/**
 * Cloudflare-specific configuration
 */
export interface CloudflareConfig {
  /** Cloudflare API Token (recommended for modern auth) */
  apiToken: string;
  /** Email for legacy API key authentication (optional) */
  email?: string;
  /** API Key for legacy authentication (optional) */
  apiKey?: string;
  /** List of zones and DNS records to manage */
  zones: ZoneConfig[];
}

/**
 * Zone configuration representing a Cloudflare DNS zone
 */
export interface ZoneConfig {
  /** Cloudflare zone ID (string to avoid precision issues) */
  zoneId: string;
  /** Root domain name (e.g., "example.com") */
  domain: string;
  /** DNS records to update within this zone */
  records: RecordConfig[];
}

/**
 * Individual DNS record configuration
 */
export interface RecordConfig {
  /** Optional DNS record ID (auto-detected if not provided) */
  id?: string;
  /** Full record name (e.g., "sub.example.com") */
  name: string;
  /** DNS record type (IPv4 or IPv6) */
  type: 'A' | 'AAAA';
  /** Whether record is proxied through Cloudflare (optional) */
  proxied?: boolean;
}

/**
 * Simple record configuration for array format (RECOMMENDED)
 * Example: [{"zone":"example.com","subdomain":"www","proxy":false}]
 */
export interface SimpleRecordConfig {
  /** Domain name (e.g., "stefanodecillis.com") */
  zone: string;
  /** Subdomain (e.g., "ha-trani") - use empty string "" for root domain */
  subdomain: string;
  /** Proxied through Cloudflare (default: false) */
  proxy: boolean | string;
  /** DNS record type (default: "A") */
  type?: 'A' | 'AAAA';
}

/**
 * Array of simple record configurations
 */
export type RecordArrayConfig = SimpleRecordConfig[];

/**
 * Complete application configuration
 */
export interface Config {
  /** Cloudflare API and zone configuration */
  cloudflare: CloudflareConfig;
  /** Seconds between DNS sync attempts (default: 300) */
  syncInterval: number;
  /** Seconds between IP checks (default: 60) */
  ipCheckInterval: number;
}
