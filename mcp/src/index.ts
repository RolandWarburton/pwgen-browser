import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config.js';
import { authenticate, challenge, resourceMetadata } from './auth.js';
import { buildServer } from './server.js';

// GET  /health                               no auth (healthcheck)
// GET  /.well-known/oauth-protected-resource  points claude.ai at Dex
// POST /mcp                                  stateless MCP, Dex bearer token

const MAX_BODY = 1024 * 1024;

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) {
      throw new Error('request body too large');
    }
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;

  if (req.method === 'GET' && path === '/health') {
    return send(res, 200, { ok: true });
  }
  if (req.method === 'GET' && path.startsWith('/.well-known/oauth-protected-resource')) {
    return send(res, 200, resourceMetadata);
  }
  if (path !== '/mcp') {
    return send(res, 404, { error: 'not found' });
  }

  let auth;
  try {
    auth = await authenticate(req.headers.authorization);
  } catch (_err) {
    return send(res, 503, { error: 'can\'t reach Dex to check the token' });
  }
  if (!auth.ok) {
    if (auth.status === 401) {
      res.setHeader('WWW-Authenticate', challenge(auth.reason));
    }
    return send(res, auth.status, { error: auth.reason });
  }

  // stateless: no SSE stream (GET) or session teardown (DELETE)
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method not allowed' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return send(res, 400, { error: err instanceof Error ? err.message : 'invalid JSON' });
  }

  // stateless transports can't be reused
  const server = buildServer(auth.caller);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('[pwgen-mcp]', err);
    if (!res.headersSent) {
      send(res, 500, { error: 'internal error' });
    }
  });
}).listen(config.port, config.host, () => {
  console.error(`[pwgen-mcp] listening on ${config.host}:${config.port}, resource ${config.resourceUrl}`);
});
