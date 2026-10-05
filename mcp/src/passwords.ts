import { randomUUID } from 'node:crypto';
import { genpw } from '@rolandwarburton/pwgen';
import { kv, BaoError, ConflictError, NotFoundError } from './bao.js';
import { config } from './config.js';
import type { KvMetadata, KvVersion } from './bao.js';

// same KV layout and rules as the extension (src/openbao/passwords.ts)
const TAB_KEY = '_tab';
const COUNTER_KEY = '_tabs';
const UNORDERED = Number.MAX_SAFE_INTEGER;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

// the extension's default generator settings
const GENERATOR = {
  minLength: 3,
  maxLength: 5,
  numberOfWords: 2,
  count: 1,
  delimiter: '-',
  prepend: '',
  append: '-secret'
};

interface Tab {
  slug: string;
  name: string;
  order: number | null;
}

interface PasswordSummary {
  tab: string;
  key: string;
  path: string;
  note: string;
  created_time: string;
  current_version: number;
  custom_metadata: Record<string, string>;
}

const fullPath = (tab: string, key: string) => `${config.baoMount}/${config.baoBasePath}/${tab}/${key}`;

function isGone(version: KvVersion | undefined): boolean {
  if (!version || version.destroyed) {
    return true;
  }
  return Boolean(version.deletion_time) && Date.parse(version.deletion_time) <= Date.now();
}

async function listTabs(): Promise<Tab[]> {
  const slugs = (await kv.list(''))
    .filter((key) => key.endsWith('/'))
    .map((key) => key.slice(0, -1))
    .filter((slug) => SLUG_PATTERN.test(slug));
  const tabs = await Promise.all(
    slugs.map(async (slug): Promise<Tab> => {
      try {
        const { data } = await kv.readData(`${slug}/${TAB_KEY}`);
        const order = parseInt(data.order, 10);
        return { slug, name: data.name || slug, order: Number.isNaN(order) ? null : order };
      } catch (err) {
        if (err instanceof NotFoundError) {
          return { slug, name: slug, order: null };
        }
        throw err;
      }
    })
  );
  return tabs.sort(
    (a, b) => (a.order ?? UNORDERED) - (b.order ?? UNORDERED) || a.name.localeCompare(b.name)
  );
}

// a typo can't create a stray folder
async function requireTab(tab: string): Promise<void> {
  if (!(await listTabs()).some((item) => item.slug === tab)) {
    throw new BaoError(`No tab "${tab}". Use list_tabs to see the tabs`, 404);
  }
}

// same shared counter as the extension
async function claimTabNumber(tabs: Tab[]): Promise<number> {
  const highest = tabs.reduce((max, tab) => {
    const match = /^tab-(\d+)$/.exec(tab.slug);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  for (let attempt = 0; attempt < 5; attempt++) {
    let next = 1;
    let version = 0;
    try {
      const counter = await kv.readData(COUNTER_KEY);
      next = parseInt(counter.data.next, 10) || 1;
      version = counter.metadata.version;
    } catch (err) {
      if (!(err instanceof NotFoundError)) {
        throw err;
      }
    }
    const claimed = Math.max(next, highest + 1);
    try {
      await kv.writeData(COUNTER_KEY, { next: String(claimed + 1) }, { cas: version });
      return claimed;
    } catch (err) {
      if (!(err instanceof ConflictError)) {
        throw err;
      }
    }
  }
  throw new ConflictError('Couldn\'t claim a tab number; try again');
}

async function createTab(name: string): Promise<Tab> {
  const tabs = await listTabs();
  const n = await claimTabNumber(tabs);
  const slug = `tab-${n}`;
  const order = tabs.reduce((max, tab) => (tab.order === null ? max : Math.max(max, tab.order + 1)), 0);
  await kv.writeData(`${slug}/${TAB_KEY}`, { name, order: String(order) }, { cas: 0 });
  return { slug, name, order };
}

function summarise(tab: string, key: string, metadata: KvMetadata): PasswordSummary {
  const meta = metadata.custom_metadata ?? {};
  return {
    tab,
    key,
    path: fullPath(tab, key),
    note: meta.note ?? '',
    created_time: metadata.created_time,
    current_version: metadata.current_version,
    custom_metadata: meta
  };
}

// live passwords in a tab, newest first, without their values
async function listPasswords(tab: string): Promise<PasswordSummary[]> {
  const keys = (await kv.list(`${tab}/`)).filter((key) => !key.endsWith('/') && !key.startsWith('_'));
  const summaries = await Promise.all(
    keys.map(async (key) => {
      try {
        const metadata = await kv.readMetadata(`${tab}/${key}`);
        return isGone(metadata.versions[String(metadata.current_version)])
          ? null
          : summarise(tab, key, metadata);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return null;
        }
        throw err;
      }
    })
  );
  return summaries
    .filter((item): item is PasswordSummary => item !== null)
    .sort((a, b) => b.created_time.localeCompare(a.created_time));
}

// case-insensitive search of notes, in one tab or every tab
async function findPasswords(query: string, tab?: string): Promise<PasswordSummary[]> {
  const tabs = tab ? [tab] : (await listTabs()).map((item) => item.slug);
  const needle = query.toLowerCase();
  const results = await Promise.all(tabs.map((slug) => listPasswords(slug)));
  return results.flat().filter((item) => item.note.toLowerCase().includes(needle));
}

async function getMetadata(tab: string, key: string) {
  const metadata = await kv.readMetadata(`${tab}/${key}`);
  return {
    ...summarise(tab, key, metadata),
    gone: isGone(metadata.versions[String(metadata.current_version)]),
    versions: Object.entries(metadata.versions)
      .map(([number, version]) => ({
        version: parseInt(number, 10),
        created_time: version.created_time,
        gone: isGone(version)
      }))
      .sort((a, b) => b.version - a.version)
  };
}

// the only function that returns a password
async function getPassword(tab: string, key: string, version?: number) {
  const secret = await kv.readData(`${tab}/${key}`, version);
  return { tab, key, path: fullPath(tab, key), version: secret.metadata.version, password: secret.data.password };
}

// `createdBy`: the caller's email
async function createPassword(tab: string, note: string, createdBy: string) {
  await requireTab(tab);
  const key = randomUUID();
  const written = await kv.writeData(`${tab}/${key}`, { password: await genpw(GENERATOR) }, { cas: 0 });
  await kv.patchMetadata(`${tab}/${key}`, {
    note,
    flagged: 'false',
    hidden: 'false',
    source: 'mcp',
    created_by: createdBy
  });
  return { tab, key, path: fullPath(tab, key), version: written.version, note };
}

// new version (generated if omitted); cas refuses it if changed meanwhile
async function updatePassword(tab: string, key: string, password?: string) {
  const metadata = await kv.readMetadata(`${tab}/${key}`);
  if (isGone(metadata.versions[String(metadata.current_version)])) {
    throw new NotFoundError(`${fullPath(tab, key)} has been deleted`);
  }
  const written = await kv.writeData(
    `${tab}/${key}`,
    { password: password ?? (await genpw(GENERATOR)) },
    { cas: metadata.current_version }
  );
  return {
    tab,
    key,
    path: fullPath(tab, key),
    version: written.version,
    generated: password === undefined
  };
}

// '' removes a key
async function updateMetadata(tab: string, key: string, fields: Record<string, string>) {
  await kv.readMetadata(`${tab}/${key}`);
  await kv.patchMetadata(
    `${tab}/${key}`,
    Object.fromEntries(Object.entries(fields).map(([name, value]) => [name, value === '' ? null : value]))
  );
  return getMetadata(tab, key);
}

// permanent: metadata and every version
async function deletePassword(tab: string, key: string) {
  await kv.readMetadata(`${tab}/${key}`);
  await kv.deleteAll(`${tab}/${key}`);
  return { deleted: true, path: fullPath(tab, key) };
}

export {
  listTabs,
  createTab,
  listPasswords,
  findPasswords,
  getMetadata,
  getPassword,
  createPassword,
  updatePassword,
  updateMetadata,
  deletePassword
};
