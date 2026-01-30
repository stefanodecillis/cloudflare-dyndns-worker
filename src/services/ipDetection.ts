/**
 * IP Detection Service
 * Detects public IP addresses with multiple providers and automatic fallback
 */

/**
 * Error thrown when IP detection fails
 */
export class IPDetectionError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'IPDetectionError';
  }
}

/**
 * Validate IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);

  if (!match) {
    return false;
  }

  // Check each octet is between 0-255
  return match.slice(1, 5).every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate IPv6 address format
 */
export function isValidIPv6(ip: string): boolean {
  // Basic IPv6 validation - checks for:
  // - At least one colon
  // - Valid hex characters
  // - Not more than 8 groups
  // - No invalid characters
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip) && ip.includes(':');
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  return isValidIPv4(ip) || isValidIPv6(ip);
}

/**
 * Fetch JSON-based IP provider
 */
async function fetchJSONProvider(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new IPDetectionError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as { ip?: string };

    if (!data || typeof data.ip !== 'string') {
      throw new IPDetectionError('Invalid response format: missing or invalid "ip" field');
    }

    const ip = data.ip.trim();

    if (!isValidIP(ip)) {
      throw new IPDetectionError(`Invalid IP format: ${ip}`);
    }

    return ip;
  } catch (error) {
    if (error instanceof IPDetectionError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new IPDetectionError(`Request timeout (5s) for ${url}`);
    }

    throw new IPDetectionError(`Failed to fetch from ${url}`, error instanceof Error ? error : undefined);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch plain text IP provider
 */
async function fetchPlainProvider(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new IPDetectionError(`HTTP ${response.status}: ${response.statusText}`);
    }

    const ip = (await response.text()).trim();

    if (!isValidIP(ip)) {
      throw new IPDetectionError(`Invalid IP format: ${ip}`);
    }

    return ip;
  } catch (error) {
    if (error instanceof IPDetectionError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new IPDetectionError(`Request timeout (5s) for ${url}`);
    }

    throw new IPDetectionError(`Failed to fetch from ${url}`, error instanceof Error ? error : undefined);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Try multiple providers and return first successful result
 */
async function tryProviders(
  providers: Array<() => Promise<string>>,
  name: string
): Promise<string> {
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      return await provider();
    } catch (error) {
      const message = error instanceof IPDetectionError ? error.message : String(error);
      errors.push(message);
      // Try next provider
    }
  }

  throw new IPDetectionError(
    `Failed to detect ${name}. Tried ${providers.length} provider(s): ${errors.join('; ')}`
  );
}

/**
 * Get public IP address (IPv4 or IPv6)
 * Tries providers that support both protocols in order
 */
export async function getPublicIP(): Promise<string> {
  const providers = [
    // api64.ipify.org supports both IPv4 and IPv6
    () => fetchJSONProvider('https://api64.ipify.org?format=json'),
    // Fallback to IPv4-specific providers
    () => fetchJSONProvider('https://api.ipify.org?format=json'),
    () => fetchPlainProvider('https://icanhazip.com'),
  ];

  return tryProviders(providers, 'public IP');
}

/**
 * Get public IPv4 address specifically
 */
export async function getPublicIPv4(): Promise<string> {
  const providers = [
    // IPv4-specific providers
    () => fetchJSONProvider('https://api.ipify.org?format=json'),
    () => fetchPlainProvider('https://ipv4.icanhazip.com'),
    () => fetchPlainProvider('https://checkip.amazonaws.com'),
  ];

  const ip = await tryProviders(providers, 'public IPv4');

  if (!isValidIPv4(ip)) {
    throw new IPDetectionError(`Received non-IPv4 address when expecting IPv4: ${ip}`);
  }

  return ip;
}

/**
 * Get public IPv6 address specifically
 * Note: Returns error if IPv6 is not available
 */
export async function getPublicIPv6(): Promise<string> {
  const providers = [
    // IPv6-capable providers
    () => fetchJSONProvider('https://api64.ipify.org?format=json'),
  ];

  const ip = await tryProviders(providers, 'public IPv6');

  if (!isValidIPv6(ip)) {
    throw new IPDetectionError(`Received non-IPv6 address when expecting IPv6: ${ip}`);
  }

  return ip;
}
