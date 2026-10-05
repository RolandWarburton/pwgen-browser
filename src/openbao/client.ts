import { ISettings } from '@types';
import { getSession, clearSession } from './session';

class BaoError extends Error {
  // 0 = no response
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'BaoError';
    this.status = status;
  }
}

// no session, or a 403 (session cleared)
class AuthError extends BaoError {
  constructor(message = 'Not signed in to OpenBao') {
    super(message, 403);
    this.name = 'AuthError';
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

class NetworkError extends BaoError {
  constructor(message = 'Can\'t reach OpenBao') {
    super(message, 0);
    this.name = 'NetworkError';
  }
}

interface RequestOptions {
  body?: unknown;
  contentType?: string;
  token?: string; // instead of the session's
  anonymous?: boolean; // OIDC login endpoints
}

// /v1/<path> -> parsed JSON (undefined on 204); errors map to the classes above
async function request<T>(
  settings: ISettings,
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (!options.anonymous) {
    const token = options.token ?? (await getSession())?.token;
    if (!token) {
      throw new AuthError();
    }
    headers['X-Vault-Token'] = token;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = options.contentType ?? 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${settings.baoAddress.replace(/\/+$/, '')}/v1/${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (_err) {
    throw new NetworkError();
  }

  const text = await response.text();
  const json = (text ? JSON.parse(text) : undefined) as { errors?: string[] } | undefined;
  if (response.ok) {
    return json as T;
  }

  const message = json?.errors?.join('; ') || `OpenBao returned ${response.status}`;
  if (response.status === 403 && !options.anonymous) {
    await clearSession();
    throw new AuthError(message);
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

// KV v2, paths relative to the base path, e.g. `tab-1/_tab`
function kv(settings: ISettings) {
  const path = (kind: 'data' | 'metadata', relative: string) =>
    `${settings.baoMount}/${kind}/${settings.baoBasePath}/${relative}`;

  return {
    // folders end in `/`; a missing folder is empty
    async list(folder: string): Promise<string[]> {
      try {
        const result = await request<{ data: { keys: string[] } }>(
          settings,
          'GET',
          `${path('metadata', folder)}?list=true`
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
      const result = await request<{ data: KvSecret }>(settings, 'GET', path('data', key) + query);
      return result.data;
    },

    async readMetadata(key: string): Promise<KvMetadata> {
      const result = await request<{ data: KvMetadata }>(settings, 'GET', path('metadata', key));
      return result.data;
    },

    // cas 0: create only | cas n: only if n is the current version
    async writeData(
      key: string,
      data: Record<string, string>,
      options: { cas?: number } = {}
    ): Promise<KvWriteResult> {
      const result = await request<{ data: KvWriteResult }>(settings, 'POST', path('data', key), {
        body: { options: options.cas === undefined ? {} : { cas: options.cas }, data }
      });
      return result.data;
    },

    // merge into custom_metadata (no new version); values are 1-512 bytes, null removes.
    // The only metadata write the pwgen policy allows
    async patchMetadata(key: string, customMetadata: Record<string, string | null>): Promise<void> {
      await request(settings, 'PATCH', path('metadata', key), {
        body: { custom_metadata: customMetadata },
        contentType: 'application/merge-patch+json'
      });
    },

    // permanent: metadata and every version
    async deleteAll(key: string): Promise<void> {
      await request(settings, 'DELETE', path('metadata', key));
    }
  };
}

export {
  BaoError,
  AuthError,
  NotFoundError,
  ConflictError,
  NetworkError,
  request,
  kv,
  KvVersion,
  KvWriteResult,
  KvSecret,
  KvMetadata
};
