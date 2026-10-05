import { ISettings, ITab, IPassword } from '@types';
import { kv, ConflictError, NotFoundError, KvMetadata } from './client';

// <mount>/<base path>/
//   _tabs          { next }          tab counter; numbers are never reused
//   tab-N/_tab     { name, order }   the folder is fixed, only the name changes
//   tab-N/<uuid>   { password }      + custom_metadata (note, flagged, hidden…)
// keys starting with `_` are never passwords
const TAB_KEY = '_tab';
const COUNTER_KEY = '_tabs';
// folders without a `_tab` (made by another tool) sort last
const UNORDERED = Number.MAX_SAFE_INTEGER;
// same rule as the MCP server
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

function highestTabNumber(tabs: ITab[]): number {
  return tabs.reduce((max, tab) => {
    const match = /^tab-(\d+)$/.exec(tab.slug);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
}

// cas on the counter, so two clients can't claim the same number
async function claimTabNumber(settings: ISettings, tabs: ITab[]): Promise<number> {
  const store = kv(settings);
  for (let attempt = 0; attempt < 5; attempt++) {
    let next = 1;
    let version = 0;
    try {
      const counter = await store.readData(COUNTER_KEY);
      next = parseInt(counter.data.next, 10) || 1;
      version = counter.metadata.version;
    } catch (err) {
      if (!(err instanceof NotFoundError)) {
        throw err;
      }
    }
    const claimed = Math.max(next, highestTabNumber(tabs) + 1);
    try {
      await store.writeData(COUNTER_KEY, { next: String(claimed + 1) }, { cas: version });
      return claimed;
    } catch (err) {
      if (!(err instanceof ConflictError)) {
        throw err;
      }
    }
  }
  throw new ConflictError('Couldn\'t claim a tab number; try again');
}

async function loadTabs(settings: ISettings): Promise<ITab[]> {
  const store = kv(settings);
  const slugs = (await store.list(''))
    .filter((key) => key.endsWith('/'))
    .map((key) => key.slice(0, -1))
    .filter((slug) => SLUG_PATTERN.test(slug));

  const tabs = await Promise.all(
    slugs.map(async (slug): Promise<ITab> => {
      try {
        const { data } = await store.readData(`${slug}/${TAB_KEY}`);
        const order = parseInt(data.order, 10);
        return { slug, name: data.name || slug, order: Number.isNaN(order) ? UNORDERED : order };
      } catch (err) {
        if (err instanceof NotFoundError) {
          return { slug, name: slug, order: UNORDERED };
        }
        throw err;
      }
    })
  );
  return tabs.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

async function createTab(settings: ISettings, tabs: ITab[]): Promise<ITab> {
  const n = await claimTabNumber(settings, tabs);
  const slug = `tab-${n}`;
  const name = `Tab ${n}`;
  const order = tabs.reduce((max, tab) => (tab.order === UNORDERED ? max : Math.max(max, tab.order + 1)), 0);
  await kv(settings).writeData(`${slug}/${TAB_KEY}`, { name, order: String(order) }, { cas: 0 });
  return { slug, name, order };
}

async function renameTab(settings: ISettings, tab: ITab, name: string): Promise<ITab> {
  const order = tab.order === UNORDERED ? 0 : tab.order;
  await kv(settings).writeData(`${tab.slug}/${TAB_KEY}`, { name, order: String(order) });
  return { ...tab, name, order };
}

// permanent: every password, then the tab
async function deleteTab(settings: ISettings, slug: string) {
  const store = kv(settings);
  const keys = (await store.list(`${slug}/`)).filter((key) => !key.endsWith('/'));
  await Promise.all(
    keys.filter((key) => key !== TAB_KEY).map((key) => store.deleteAll(`${slug}/${key}`))
  );
  await store.deleteAll(`${slug}/${TAB_KEY}`);
}

// gone = destroyed, or past its deletion_time
function isLive(metadata: KvMetadata): boolean {
  const version = metadata.versions[String(metadata.current_version)];
  if (!version || version.destroyed) {
    return false;
  }
  return !version.deletion_time || Date.parse(version.deletion_time) > Date.now();
}

function toPassword(key: string, metadata: KvMetadata, password: string): IPassword {
  const meta = metadata.custom_metadata ?? {};
  return {
    key,
    password,
    note: meta.note ?? '',
    flagged: meta.flagged === 'true',
    hidden: meta.hidden === 'true',
    createdTime: metadata.created_time,
    version: metadata.current_version,
    meta
  };
}

// null when deleted or destroyed elsewhere
async function loadPassword(settings: ISettings, slug: string, key: string): Promise<IPassword | null> {
  const store = kv(settings);
  try {
    const metadata = await store.readMetadata(`${slug}/${key}`);
    if (!isLive(metadata)) {
      return null;
    }
    const secret = await store.readData(`${slug}/${key}`);
    return toPassword(key, metadata, secret.data.password ?? '');
  } catch (err) {
    if (err instanceof NotFoundError) {
      return null;
    }
    throw err;
  }
}

// live passwords, newest first
async function loadPasswords(settings: ISettings, slug: string): Promise<IPassword[]> {
  const keys = (await kv(settings).list(`${slug}/`)).filter(
    (key) => !key.endsWith('/') && !key.startsWith('_')
  );
  const passwords = await Promise.all(keys.map((key) => loadPassword(settings, slug, key)));
  return passwords
    .filter((password): password is IPassword => password !== null)
    .sort((a, b) => b.createdTime.localeCompare(a.createdTime));
}

async function addPassword(
  settings: ISettings,
  slug: string,
  password: string,
  createdBy: string,
  options: { key?: string; note?: string; meta?: Record<string, string> } = {}
): Promise<IPassword> {
  const store = kv(settings);
  const key = options.key ?? crypto.randomUUID();
  const meta: Record<string, string> = {
    flagged: 'false',
    hidden: 'false',
    source: 'pwgen-browser',
    created_by: createdBy,
    ...options.meta
  };
  if (options.note) {
    meta.note = options.note;
  }
  const written = await store.writeData(`${slug}/${key}`, { password }, { cas: 0 });
  await store.patchMetadata(`${slug}/${key}`, meta);
  return {
    key,
    password,
    note: meta.note ?? '',
    flagged: false,
    hidden: false,
    createdTime: written.created_time,
    version: written.version,
    meta
  };
}

// new KV version; ConflictError if changed since `currentVersion`
async function updatePassword(
  settings: ISettings,
  slug: string,
  key: string,
  password: string,
  currentVersion: number
): Promise<number> {
  const written = await kv(settings).writeData(`${slug}/${key}`, { password }, { cas: currentVersion });
  return written.version;
}

// custom_metadata only (no new version); '' removes a key
async function updatePasswordMeta(
  settings: ISettings,
  slug: string,
  key: string,
  meta: Record<string, string>
) {
  const patch = Object.fromEntries(
    Object.entries(meta).map(([name, value]) => [name, value === '' ? null : value])
  );
  await kv(settings).patchMetadata(`${slug}/${key}`, patch);
}

// permanent: metadata and every version
async function deletePassword(settings: ISettings, slug: string, key: string) {
  await kv(settings).deleteAll(`${slug}/${key}`);
}

export {
  loadTabs,
  createTab,
  renameTab,
  deleteTab,
  loadPassword,
  loadPasswords,
  addPassword,
  updatePassword,
  updatePasswordMeta,
  deletePassword
};
