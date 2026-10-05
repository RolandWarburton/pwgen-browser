import { config } from './config.js';

class BaoError extends Error {
  // 0 = no response
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'BaoError';
    this.status = status;
  }
}

class NotFoundError extends BaoError {
  constructor(message = 'Not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// lost a check-and-set race
class ConflictError extends BaoError {
  constructor(message = 'Changed elsewhere') {
    super(message, 400);
    this.name = 'ConflictError';
  }
}

// AppRole token; re-login a minute before expiry or when rejected
let token: { value: string; expiresAt: number } | null = null;

async function login(): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${config.baoAddress}/v1/auth/approle/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: config.baoRoleId, secret_id: config.baoSecretId })
    });
  } catch (_err) {
    throw new BaoError(`Can't reach OpenBao at ${config.baoAddress}`, 0);
  }
  const json = (await response.json()) as {
    auth?: { client_token: string; lease_duration: number };
    errors?: string[];
  };
  if (!response.ok || !json.auth) {
    throw new BaoError(`OpenBao AppRole login failed: ${json.errors?.join('; ') ?? response.status}`, response.status);
  }
  token = {
    value: json.auth.client_token,
    expiresAt: Date.now() + Math.max(json.auth.lease_duration - 60, 30) * 1000
  };
  return token.value;
}

// concurrent requests share one login
let loggingIn: Promise<string> | null = null;

async function getToken(): Promise<string> {
  if (token && token.expiresAt > Date.now()) {
    return token.value;
  }
  loggingIn ??= login().finally(() => {
    loggingIn = null;
  });
  return loggingIn;
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; contentType?: string } = {},
  retried = false
): Promise<T> {
  const headers: Record<string, string> = { 'X-Vault-Token': await getToken() };
  if (options.body !== undefined) {
    headers['Content-Type'] = options.contentType ?? 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${config.baoAddress}/v1/${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (_err) {
    throw new BaoError(`Can't reach OpenBao at ${config.baoAddress}`, 0);
  }

  const text = await response.text();
  const json = (text ? JSON.parse(text) : undefined) as { errors?: string[] } | undefined;
  if (response.ok) {
    return json as T;
  }

  const message = json?.errors?.join('; ') || `OpenBao returned ${response.status}`;
  if (response.status === 403) {
    if (!retried) {
      // revoked or expired early: log in again once
      token = null;
      return request<T>(method, path, options, true);
    }
    throw new BaoError(`OpenBao refused access: ${message}`, 403);
  }
  if (response.status === 404) {
    throw new NotFoundError(message);
  }
  if (response.status === 400 && /check-and-set/i.test(message)) {
    throw new ConflictError(message);
  }
  throw new BaoError(message, response.status);
}

interface KvVersion {
  created_time: string;
  deletion_time: string; // '' unless soft-deleted
  destroyed: boolean;
}

interface KvWriteResult extends KvVersion {
  version: number;
}

interface KvSecret {
  data: Record<string, string>;
  metadata: KvWriteResult;
}

interface KvMetadata {
  created_time: string;
  updated_time: string;
  current_version: number;
  custom_metadata: Record<string, string> | null;
  versions: Record<string, KvVersion>;
}

// paths are relative to the base path, e.g. `tab-1/_tab`
const kvPath = (kind: 'data' | 'metadata', relative: string) =>
  `${config.baoMount}/${kind}/${config.baoBasePath}/${relative}`;

const kv = {
  // folders end in `/`; a missing folder is empty
  async list(folder: string): Promise<string[]> {
    try {
      const result = await request<{ data: { keys: string[] } }>(
        'GET',
        `${kvPath('metadata', folder)}?list=true`
      );
      return result.data.keys;
    } catch (err) {
      if (err instanceof NotFoundError) {
        return [];
      }
      throw err;
    }
  },

  async readData(key: string, version?: number): Promise<KvSecret> {
    const query = version === undefined ? '' : `?version=${version}`;
    const result = await request<{ data: KvSecret }>('GET', kvPath('data', key) + query);
    return result.data;
  },

  async readMetadata(key: string): Promise<KvMetadata> {
    const result = await request<{ data: KvMetadata }>('GET', kvPath('metadata', key));
    return result.data;
  },

  // cas 0: create only | cas n: only if n is the current version
  async writeData(
    key: string,
    data: Record<string, string>,
    options: { cas?: number } = {}
  ): Promise<KvWriteResult> {
    const result = await request<{ data: KvWriteResult }>('POST', kvPath('data', key), {
      body: { options: options.cas === undefined ? {} : { cas: options.cas }, data }
    });
    return result.data;
  },

  // merge into custom_metadata (no new version); null removes a key
  async patchMetadata(key: string, customMetadata: Record<string, string | null>): Promise<void> {
    await request('PATCH', kvPath('metadata', key), {
      body: { custom_metadata: customMetadata },
      contentType: 'application/merge-patch+json'
    });
  },

  // permanent: metadata and every version
  async deleteAll(key: string): Promise<void> {
    await request('DELETE', kvPath('metadata', key));
  }
};

export { BaoError, NotFoundError, ConflictError, kv };
export type { KvMetadata, KvVersion };
