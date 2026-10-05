import { createHash } from 'node:crypto';
import { config } from './config.js';

// claude.ai --Bearer (Dex token)--> /mcp --userinfo--> Dex   (gate only)
//                                    \--own AppRole token--> OpenBao

interface Caller {
  email: string;
}

type AuthResult = { ok: true; caller: Caller } | { ok: false; status: 401 | 403; reason: string };

// a burst of tool calls costs one Dex round trip
const CACHE_MS = 60_000;
const cache = new Map<string, { caller: Caller; until: number }>();

// JWT payload, unverified: userinfo has already vouched for the token
function claims(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch (_err) {
    return null;
  }
}

// throws only when Dex can't be reached
async function authenticate(header: string | undefined): Promise<AuthResult> {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  if (!match) {
    return { ok: false, status: 401, reason: 'missing bearer token' };
  }
  const token = match[1];
  const id = createHash('sha256').update(token).digest('hex');
  const hit = cache.get(id);
  if (hit && hit.until > Date.now()) {
    return { ok: true, caller: hit.caller };
  }

  const response = await fetch(`${config.oidcIssuer}/userinfo`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    return { ok: false, status: 401, reason: `Dex rejected the token (${response.status})` };
  }

  // refuse tokens issued to other Dex clients
  const audience = claims(token)?.aud;
  const audiences = Array.isArray(audience) ? audience : [audience];
  if (!audiences.includes(config.oidcAudience)) {
    return { ok: false, status: 401, reason: `token was not issued to ${config.oidcAudience}` };
  }

  const info = (await response.json()) as { email?: string };
  const email = info.email?.toLowerCase();
  if (!email || !config.allowedEmails.includes(email)) {
    return { ok: false, status: 403, reason: `${email ?? 'this account'} is not allowed` };
  }

  const caller = { email };
  cache.set(id, { caller, until: Date.now() + CACHE_MS });
  for (const [key, entry] of cache) {
    if (entry.until <= Date.now()) {
      cache.delete(key);
    }
  }
  return { ok: true, caller };
}

// RFC 9728: tells claude.ai to sign in with Dex
const resourceOrigin = new URL(config.resourceUrl).origin;
const metadataUrl = `${resourceOrigin}/.well-known/oauth-protected-resource`;
const resourceMetadata = {
  resource: config.resourceUrl,
  authorization_servers: [config.oidcIssuer],
  bearer_methods_supported: ['header'],
  scopes_supported: ['openid', 'email', 'profile', 'offline_access']
};

const challenge = (reason: string) =>
  `Bearer resource_metadata="${metadataUrl}", error="invalid_token", error_description="${reason.replace(/"/g, '\'')}"`;

export { authenticate, resourceMetadata, challenge };
export type { Caller };
