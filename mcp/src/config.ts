// from the environment; a missing required value exits at startup

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`[pwgen-mcp] ${name} must be set`);
    process.exit(2);
  }
  return value;
}

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const config = {
  host: process.env.MCP_HOST || '0.0.0.0',
  port: parseInt(process.env.MCP_PORT || '8080', 10),

  // public URL of /mcp
  resourceUrl: required('MCP_RESOURCE_URL'),
  oidcIssuer: (process.env.MCP_OIDC_ISSUER || 'https://auth.example.net').replace(/\/+$/, ''),
  oidcAudience: process.env.MCP_OIDC_AUDIENCE || 'pwgen-mcp',
  allowedEmails: list(required('MCP_ALLOWED_EMAILS')),

  // OpenBao, via the server's AppRole login
  baoAddress: (process.env.BAO_ADDR || 'https://openbao.example.net').replace(/\/+$/, ''),
  baoMount: process.env.BAO_MOUNT || 'kv',
  baoBasePath: process.env.BAO_BASE_PATH || 'pwgen',
  baoRoleId: required('BAO_ROLE_ID'),
  baoSecretId: required('BAO_SECRET_ID')
};

export { config };
