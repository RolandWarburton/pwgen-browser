import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  createPassword,
  createTab,
  deletePassword,
  findPasswords,
  getMetadata,
  getPassword,
  listPasswords,
  listTabs,
  updatePassword,
  updateMetadata
} from './passwords.js';
import type { Caller } from './auth.js';

// generic tools over the extension's tabs and passwords. Only get_password
// returns a password; the rest return paths and metadata

// validated so no call reaches outside the base path
const tab = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, 'a tab slug such as tab-1')
  .describe('tab slug, e.g. tab-1 (from list_tabs)');
const key = z.uuid().describe('the password\'s key (a uuid, from list_passwords or find_passwords)');
// custom_metadata values are 1-512 bytes
const note = z
  .string()
  .min(1)
  .refine((value) => Buffer.byteLength(value) <= 512, 'at most 512 bytes');

// result or error -> MCP content
async function respond(run: () => Promise<unknown>) {
  try {
    return { content: [{ type: 'text' as const, text: JSON.stringify(await run(), null, 2) }] };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: err instanceof Error ? err.message : String(err) }]
    };
  }
}

// one per request; `caller` is recorded as created_by
function buildServer(caller: Caller): McpServer {
  const server = new McpServer({ name: 'pwgen', version: '0.1.0' });

  server.registerTool(
    'list_tabs',
    {
      description: 'List the pwgen tabs (folders under kv/pwgen/) with their display names, in panel order.',
      annotations: { readOnlyHint: true }
    },
    () => respond(listTabs)
  );

  server.registerTool(
    'create_tab',
    {
      description:
        'Create a tab. Its folder is the next tab-N from the shared counter; `name` is the display name shown in pwgen-browser.',
      inputSchema: { name: z.string().min(1).max(100).describe('display name') }
    },
    ({ name }) => respond(() => createTab(name))
  );

  server.registerTool(
    'list_passwords',
    {
      description:
        'List the passwords in a tab, newest first: key, OpenBao path, note and metadata. Never returns password values.',
      inputSchema: { tab },
      annotations: { readOnlyHint: true }
    },
    (args) => respond(() => listPasswords(args.tab))
  );

  server.registerTool(
    'find_passwords',
    {
      description:
        'Find passwords whose note contains `query` (case-insensitive), in one tab or all tabs. Never returns password values.',
      inputSchema: { query: z.string().min(1), tab: tab.optional() },
      annotations: { readOnlyHint: true }
    },
    (args) => respond(() => findPasswords(args.query, args.tab))
  );

  server.registerTool(
    'get_password_metadata',
    {
      description: 'Read one password\'s metadata and version list. Never returns password values.',
      inputSchema: { tab, key },
      annotations: { readOnlyHint: true }
    },
    (args) => respond(() => getMetadata(args.tab, args.key))
  );

  server.registerTool(
    'get_password',
    {
      description:
        'Return a password in plaintext (current version, or `version`). The value ends up in the conversation: only call this when the user asks for the password.',
      inputSchema: { tab, key, version: z.number().int().positive().optional() },
      annotations: { readOnlyHint: true }
    },
    (args) => respond(() => getPassword(args.tab, args.key, args.version))
  );

  server.registerTool(
    'create_password',
    {
      description:
        'Generate a password (same generator as pwgen-browser) and save it in an existing tab with `note`. Returns its path and key, never the password.',
      inputSchema: { tab, note: note.describe('what the password is for, e.g. a new starter\'s username') }
    },
    (args) => respond(() => createPassword(args.tab, args.note, caller.email))
  );

  server.registerTool(
    'update_password',
    {
      description:
        'Change a saved password, like Edit in pwgen-browser. Pass `password` to set that value, or leave it out to generate a new one (same generator as pwgen-browser). Saved as a new version; the old value is kept as an earlier version and the path doesn\'t change. Refused if the password changed meanwhile. Returns the new version number, never the password.',
      inputSchema: {
        tab,
        key,
        password: z.string().min(1).max(1024).optional().describe('the new value; omit to generate one')
      }
    },
    (args) => respond(() => updatePassword(args.tab, args.key, args.password))
  );

  server.registerTool(
    'update_password_metadata',
    {
      description:
        'Set metadata fields on a password, e.g. { "note": "jane.doe" }. An empty value removes the field. Doesn\'t change the password.',
      inputSchema: {
        tab,
        key,
        fields: z
          .record(
            z.string().regex(/^[a-z][a-z0-9_]{0,63}$/, 'lowercase field names'),
            z.string().refine((value) => Buffer.byteLength(value) <= 512, 'at most 512 bytes')
          )
          .describe('field name to value')
      },
      annotations: { idempotentHint: true }
    },
    (args) => respond(() => updateMetadata(args.tab, args.key, args.fields))
  );

  server.registerTool(
    'delete_password',
    {
      description: 'Permanently delete a password and every version of it. Cannot be undone.',
      inputSchema: { tab, key },
      annotations: { destructiveHint: true }
    },
    (args) => respond(() => deletePassword(args.tab, args.key))
  );

  return server;
}

export { buildServer };
