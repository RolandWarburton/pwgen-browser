import { useEffect, useState } from 'react';
import { IBaoSession } from '@types';

// chrome.storage.local: sign-in survives restarts, but the token is on disk
const SESSION_KEY = 'baoSession';

// null when missing or expired
async function getSession(): Promise<IBaoSession | null> {
  const result = await chrome.storage.local.get(SESSION_KEY);
  const session = result[SESSION_KEY] as IBaoSession | undefined;
  if (!session) {
    return null;
  }
  if (session.expiresAt <= Date.now()) {
    await clearSession();
    return null;
  }
  return session;
}

async function saveSession(session: IBaoSession) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

async function clearSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

// live across pages: undefined = loading, null = signed out
function useBaoSession(): IBaoSession | null | undefined {
  const [session, setSession] = useState<IBaoSession | null | undefined>(undefined);

  useEffect(() => {
    getSession().then(setSession);
    const onChanged = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (SESSION_KEY in changes) {
        setSession((changes[SESSION_KEY].newValue as IBaoSession | undefined) ?? null);
      }
    };
    chrome.storage.local.onChanged.addListener(onChanged);
    return () => chrome.storage.local.onChanged.removeListener(onChanged);
  }, []);

  return session;
}

export { getSession, saveSession, clearSession, useBaoSession };
