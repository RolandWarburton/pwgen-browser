import { ISettings, IBaoSession } from '@types';
import { BaoError, AuthError, request } from './client';
import { getSession, saveSession, clearSession } from './session';

interface AuthResponse {
  auth: {
    client_token: string;
    lease_duration: number; // seconds
  };
}

async function startSession(settings: ISettings, token: string, ttl: number): Promise<IBaoSession> {
  const lookup = await request<{ data: { display_name: string } }>(
    settings,
    'GET',
    'auth/token/lookup-self',
    { token }
  );
  const session: IBaoSession = {
    token,
    ttl,
    expiresAt: Date.now() + ttl * 1000,
    displayName: lookup.data.display_name.replace(/^oidc-/, '') // `oidc-<email>`
  };
  await saveSession(session);
  return session;
}

// ext --auth_url---------> OpenBao   returns a Dex login URL
// ext --launchWebAuthFlow-> Dex       redirects to <ext-id>.chromiumapp.org/cb?code
// ext --callback(code)----> OpenBao   returns a token
async function signIn(settings: ISettings): Promise<IBaoSession> {
  const redirectUri = chrome.identity.getRedirectURL('cb');
  const clientNonce = crypto.randomUUID();

  const start = await request<{ data: { auth_url: string } }>(
    settings,
    'POST',
    'auth/oidc/oidc/auth_url',
    {
      anonymous: true,
      body: { role: settings.baoRole, redirect_uri: redirectUri, client_nonce: clientNonce }
    }
  );
  // an empty URL (not an error) means the role doesn't allow the redirect URI
  if (!start.data.auth_url) {
    throw new BaoError(`Role "${settings.baoRole}" doesn't allow ${redirectUri}`, 400);
  }

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: start.data.auth_url,
    interactive: true
  });
  if (!responseUrl) {
    throw new BaoError('Sign-in was cancelled', 0);
  }
  const params = new URL(responseUrl).searchParams;
  const error = params.get('error');
  if (error) {
    throw new BaoError(params.get('error_description') ?? error, 400);
  }

  const query = new URLSearchParams({
    state: params.get('state') ?? '',
    code: params.get('code') ?? '',
    client_nonce: clientNonce
  });
  const callback = await request<AuthResponse>(
    settings,
    'GET',
    `auth/oidc/oidc/callback?${query.toString()}`,
    { anonymous: true }
  );
  return startSession(settings, callback.auth.client_token, callback.auth.lease_duration);
}

// renews past half the lease; null when signed out
async function renewIfNeeded(settings: ISettings): Promise<IBaoSession | null> {
  const session = await getSession();
  if (!session || session.expiresAt - Date.now() > (session.ttl * 1000) / 2) {
    return session;
  }
  try {
    const renewed = await request<AuthResponse>(settings, 'POST', 'auth/token/renew-self', {
      body: {}
    });
    const next: IBaoSession = {
      ...session,
      ttl: renewed.auth.lease_duration,
      expiresAt: Date.now() + renewed.auth.lease_duration * 1000
    };
    await saveSession(next);
    return next;
  } catch (err) {
    if (err instanceof AuthError) {
      return null;
    }
    // offline or server error: keep the token
    return session;
  }
}

async function signOut(settings: ISettings) {
  try {
    await request(settings, 'POST', 'auth/token/revoke-self');
  } catch (_err) {
    // expired or offline: clearing locally is enough
  }
  await clearSession();
}

export { signIn, renewIfNeeded, signOut };
