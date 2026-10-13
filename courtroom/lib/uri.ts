const HEX64 = /^[0-9a-fA-F]{64}$/;

/** Browser-openable URL for an exhibit uri, or null when there is none. */
export function resolveUri(uri: string, gateway: string): string | null {
  if (uri.startsWith('bzz://')) {
    const rest = uri.slice('bzz://'.length);
    return HEX64.test(rest) ? `${gateway}/bzz/${rest}/` : `${gateway}/bzz/${rest}`;
  }
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`;
  if (/^https?:\/\//.test(uri) || uri.startsWith('data:')) return uri;
  return null;
}

function decodeDataUriBytes(uri: string): Uint8Array {
  const comma = uri.indexOf(',');
  if (comma < 0) throw new Error('malformed data: URI');
  const meta = uri.slice(5, comma);
  const payload = uri.slice(comma + 1);
  if (meta.split(';').includes('base64')) return new Uint8Array(Buffer.from(payload, 'base64'));
  return new Uint8Array(Buffer.from(decodeURIComponent(payload), 'utf8'));
}

/** Exact bytes behind a uri: data: decoded, bzz:// via the gateway, http(s) fetched. */
export async function fetchUriBytes(uri: string, gateway: string, timeoutMs = 10_000): Promise<Uint8Array> {
  if (uri.startsWith('data:')) return decodeDataUriBytes(uri);
  const url = resolveUri(uri, gateway);
  if (!url) throw new Error(`unsupported uri scheme: ${uri.split(':')[0]}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function fetchUriText(uri: string, gateway: string, maxBytes = 32_000): Promise<string> {
  const bytes = await fetchUriBytes(uri, gateway);
  const text = Buffer.from(bytes).toString('utf8');
  return text.length > maxBytes ? `${text.slice(0, maxBytes)}\n[truncated]` : text;
}
