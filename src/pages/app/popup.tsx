import { useState, useEffect, useRef } from 'react';
import { styled } from 'goober';
import { Link } from 'react-router';
// @ts-types="../../types/pwgen.d.ts"
import { genpw } from '@rolandwarburton/pwgen';
import {
  ButtonGroupButton,
  Button,
  Banner,
  Container,
  SettingsButton,
  ButtonGroup,
  Row
} from '../../components/styles/index.ts';
import { getActiveTabId, getSettings, saveActiveTabId } from '@/storage/index.ts';
import { ITab, IPassword, ISettings } from '../../types/index.ts';
import { AuthError, ConflictError, NetworkError, NotFoundError } from '@/openbao/client.ts';
import { signIn, renewIfNeeded } from '@/openbao/auth.ts';
import { useBaoSession } from '@/openbao/session.ts';
import {
  addPassword,
  createTab,
  deletePassword as deleteStoredPassword,
  deleteTab as deleteStoredTab,
  loadPassword,
  loadPasswords,
  loadTabs,
  renameTab as renameStoredTab,
  updatePassword,
  updatePasswordMeta
} from '@/openbao/passwords.ts';
import Password from '@components/password-row/index.tsx';
import Tabs from '@components/tabs/index.tsx';

const Page = styled('div')`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

interface IProblem {
  message: string;
  retry?: () => void;
}

const newestFirst = (a: IPassword, b: IPassword) => b.createdTime.localeCompare(a.createdTime);

const App = () => {
  const [settings, setSettings] = useState<ISettings | null>(null);
  const session = useBaoSession();
  const signedIn = Boolean(session);
  const [password, setPassword] = useState('');
  // a live view of OpenBao; nothing is cached locally
  const [tabs, setTabs] = useState<ITab[] | null>(null);
  const [activeTabId, setActiveTabId] = useState('');
  const [passwords, setPasswords] = useState<IPassword[] | null>(null);
  const [deletingTabId, setDeletingTabId] = useState<string | undefined>(undefined);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [problem, setProblem] = useState<IProblem | null>(null);
  // async work started for one tab must not land in another
  const activeTabRef = useRef('');
  activeTabRef.current = activeTabId;
  // a load finishing after a newer one is ignored
  const loadId = useRef(0);
  // latest list, for handlers from timers set in earlier renders
  const passwordsRef = useRef(passwords);
  passwordsRef.current = passwords;

  // an AuthError has already cleared the session, which shows the sign-in prompt
  const report = (err: unknown, retry?: () => void) => {
    if (err instanceof AuthError) {
      setProblem({ message: 'Your OpenBao session ended. Sign in again.' });
    } else if (err instanceof NetworkError) {
      setProblem({ message: err.message, retry });
    } else {
      setProblem({ message: err instanceof Error ? err.message : String(err), retry });
    }
  };

  const loadActivePasswords = async (settings: ISettings, slug: string) => {
    const id = ++loadId.current;
    try {
      const loaded = await loadPasswords(settings, slug);
      if (id === loadId.current) {
        setPasswords(loaded);
      }
    } catch (err) {
      if (id === loadId.current) {
        report(err, () => loadActivePasswords(settings, slug));
      }
    }
  };

  const loadAll = async (settings: ISettings) => {
    try {
      let loaded = await loadTabs(settings);
      if (loaded.length === 0) {
        // first sign-in: create `Tab 1`
        loaded = [await createTab(settings, [])];
      }
      setTabs(loaded);
      const slug = await getActiveTabId(loaded.map((tab) => tab.slug));
      if (slug === activeTabRef.current) {
        // the passwords effect won't fire for an unchanged tab
        await loadActivePasswords(settings, slug);
      } else {
        setActiveTabId(slug);
      }
      setProblem(null);
    } catch (err) {
      report(err, () => loadAll(settings));
    }
  };

  const generate = async (current: ISettings | null = settings) => {
    if (!current) {
      return;
    }
    setPassword(await genpw(current));
  };

  // fresh password each time the panel opens
  useEffect(() => {
    getSettings()
      .then((loaded) => {
        setSettings(loaded);
        return generate(loaded);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  // load the tabs once signed in; clear them on sign-out
  useEffect(() => {
    if (!settings || session === undefined) {
      return;
    }
    if (signedIn) {
      loadAll(settings);
    } else {
      setTabs(null);
      setPasswords(null);
      setActiveTabId('');
    }
  }, [settings, signedIn]);

  // load the selected tab's passwords, and remember the tab for next time
  useEffect(() => {
    if (!settings || !signedIn || !activeTabId) {
      return;
    }
    setPasswords(null);
    setConfirmClear(false);
    saveActiveTabId(activeTabId);
    loadActivePasswords(settings, activeTabId);
  }, [activeTabId]);

  // coming back to the panel: renew the token and pick up changes made elsewhere
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible' || !settings || !signedIn) {
        return;
      }
      if (await renewIfNeeded(settings)) {
        await loadAll(settings);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [settings, signedIn]);

  const handleSignIn = async () => {
    if (!settings) {
      return;
    }
    setSigningIn(true);
    try {
      await signIn(settings);
      setProblem(null);
    } catch (err) {
      report(err);
    } finally {
      setSigningIn(false);
    }
  };

  // only touch the list if it still belongs to `slug`
  const updateList = (slug: string, update: (list: IPassword[]) => IPassword[]) => {
    if (slug === activeTabRef.current) {
      setPasswords((list) => (list ? update(list) : list));
    }
  };

  const dropPassword = (slug: string, key: string) =>
    updateList(slug, (list) => list.filter((item) => item.key !== key));

  // optimistic: apply `update` (null removes), run `write`, roll back on failure
  const changePassword = async (
    key: string,
    update: ((item: IPassword) => IPassword) | null,
    write: (settings: ISettings, slug: string) => Promise<void>
  ) => {
    const original = passwordsRef.current?.find((item) => item.key === key);
    if (!settings || !original) {
      return;
    }
    const slug = activeTabRef.current;
    updateList(slug, (list) =>
      update
        ? list.map((item) => (item.key === key ? update(item) : item))
        : list.filter((item) => item.key !== key)
    );
    try {
      await write(settings, slug);
      setProblem(null);
    } catch (err) {
      if (err instanceof NotFoundError) {
        // gone from OpenBao: drop it here too
        dropPassword(slug, key);
        if (update) {
          setProblem({ message: 'That password was deleted elsewhere.' });
        }
        return;
      }
      updateList(slug, (list) =>
        [...list.filter((item) => item.key !== key), original].sort(newestFirst)
      );
      report(err);
    }
  };

  // reads one password again before it is copied, shown or revealed
  const recheck = async (key: string): Promise<IPassword | null> => {
    if (!settings) {
      return null;
    }
    const slug = activeTabRef.current;
    try {
      const current = await loadPassword(settings, slug, key);
      if (!current) {
        dropPassword(slug, key);
        setProblem({ message: 'That password was deleted elsewhere.' });
        return null;
      }
      updateList(slug, (list) => list.map((item) => (item.key === key ? current : item)));
      return current;
    } catch (err) {
      report(err);
      return null;
    }
  };

  // on failure the password stays in the field
  const pushNewPassword = async () => {
    if (password === '' || !settings || !session || !activeTabId) {
      return;
    }
    const slug = activeTabId;
    setSaving(true);
    try {
      const added = await addPassword(settings, slug, password, session.displayName);
      updateList(slug, (list) => [added, ...list]);
      setProblem(null);
    } catch (err) {
      report(err);
    } finally {
      setSaving(false);
    }
  };

  // permanent; two clicks because confirm() would freeze the panel
  const clear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    if (!settings || !passwords) {
      return;
    }
    const slug = activeTabId;
    const keys = passwords.map((item) => item.key);
    updateList(slug, () => []);
    const results = await Promise.allSettled(
      keys.map((key) => deleteStoredPassword(settings, slug, key))
    );
    const failed = results.find(
      (result): result is PromiseRejectedResult =>
        result.status === 'rejected' && !(result.reason instanceof NotFoundError)
    );
    if (failed) {
      report(failed.reason);
      loadActivePasswords(settings, slug);
    }
  };

  // new version; refused (and the row reloaded) if changed elsewhere
  const savePassword = async (key: string, value: string) => {
    const original = passwordsRef.current?.find((item) => item.key === key);
    if (!settings || !original || value === '' || value === original.password) {
      return;
    }
    const slug = activeTabRef.current;
    const showRow = (row: IPassword) =>
      updateList(slug, (list) => list.map((item) => (item.key === key ? row : item)));
    showRow({ ...original, password: value });
    try {
      const version = await updatePassword(settings, slug, key, value, original.version);
      showRow({ ...original, password: value, version });
      setProblem(null);
    } catch (err) {
      if (err instanceof ConflictError) {
        if (await recheck(key)) {
          setProblem({ message: 'That password was changed elsewhere, so it has been reloaded. Make your change again.' });
        }
      } else if (err instanceof NotFoundError) {
        dropPassword(slug, key);
        setProblem({ message: 'That password was deleted elsewhere.' });
      } else {
        showRow(original);
        report(err);
      }
    }
  };

  const deletePassword = (key: string) =>
    changePassword(key, null, (settings, slug) => deleteStoredPassword(settings, slug, key));

  const updateNote = (key: string, note: string) =>
    changePassword(
      key,
      (item) => ({ ...item, note, meta: { ...item.meta, note } }),
      (settings, slug) => updatePasswordMeta(settings, slug, key, { note })
    );

  // toggle from the current row, not the render-time one
  const toggle = (key: string, field: 'flagged' | 'hidden') => {
    const item = passwordsRef.current?.find((current) => current.key === key);
    if (!item) {
      return;
    }
    const value = !item[field];
    changePassword(
      key,
      (current) => ({ ...current, [field]: value, meta: { ...current.meta, [field]: String(value) } }),
      (settings, slug) => updatePasswordMeta(settings, slug, key, { [field]: String(value) })
    );
  };

  const flagPassword = (key: string) => toggle(key, 'flagged');
  const hidePassword = (key: string) => toggle(key, 'hidden');

  const addTab = async () => {
    if (!settings || !tabs) {
      return;
    }
    try {
      const tab = await createTab(settings, tabs);
      setTabs([...tabs, tab]);
      setActiveTabId(tab.slug);
      setProblem(null);
    } catch (err) {
      report(err, () => loadAll(settings));
    }
  };

  const renameTab = async (slug: string, name: string) => {
    const tab = tabs?.find((item) => item.slug === slug);
    if (!settings || !tabs || !tab || tab.name === name) {
      return;
    }
    setTabs(tabs.map((item) => (item.slug === slug ? { ...item, name } : item)));
    try {
      await renameStoredTab(settings, tab, name);
      setProblem(null);
    } catch (err) {
      setTabs((current) => current && current.map((item) => (item.slug === slug ? tab : item)));
      report(err);
    }
  };

  // permanent: the tab and every password in it
  const deleteTab = async (slug: string) => {
    if (!settings || !tabs || tabs.length <= 1) {
      return;
    }
    setDeletingTabId(slug);
    try {
      await deleteStoredTab(settings, slug);
      const remaining = tabs.filter((tab) => tab.slug !== slug);
      setTabs(remaining);
      if (slug === activeTabId) {
        setActiveTabId(remaining[0].slug);
      }
      setProblem(null);
    } catch (err) {
      // some passwords may be gone; show what's left
      report(err);
      loadAll(settings);
    } finally {
      setDeletingTabId(undefined);
    }
  };

  return (
    <Page>
      {tabs && (
        <Tabs
          tabs={tabs}
          activeTabId={activeTabId}
          deletingId={deletingTabId}
          selectTab={setActiveTabId}
          addTab={addTab}
          deleteTab={deleteTab}
          renameTab={renameTab}
        />
      )}
      <Container>
        <Row columns="auto 1fr">
          password:{' '}
          <input
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </Row>
        {problem && (
          <Banner data-kind="error">
            <span>{problem.message}</span>
            <span>
              {problem.retry && (
                <Button
                  onClick={() => {
                    setProblem(null);
                    problem.retry?.();
                  }}
                >
                  Retry
                </Button>
              )}
              <Button onClick={() => setProblem(null)}>✕</Button>
            </span>
          </Banner>
        )}
        {session === null && (
          <Banner>
            <span>Sign in to OpenBao to see and save passwords.</span>
            <Button onClick={handleSignIn} disabled={signingIn || !settings}>
              {signingIn ? 'Signing in…' : 'Sign in'}
            </Button>
          </Banner>
        )}
        {signedIn && tabs && passwords === null && <Banner>Loading…</Banner>}
        {passwords &&
          passwords.map((item) => (
            <Password
              key={item.key}
              password={item}
              deletePassword={deletePassword}
              updateNote={updateNote}
              flagPassword={flagPassword}
              hidePassword={hidePassword}
              savePassword={savePassword}
              recheck={recheck}
            />
          ))}
      </Container>
      <ButtonGroup>
        <ButtonGroupButton onClick={() => generate()}>generate</ButtonGroupButton>
        <ButtonGroupButton onClick={pushNewPassword} disabled={!signedIn || !tabs || saving}>
          {saving ? 'Saving…' : 'Add to list'}
        </ButtonGroupButton>
        <ButtonGroupButton
          onClick={clear}
          onMouseLeave={() => setConfirmClear(false)}
          disabled={!passwords || passwords.length === 0}
          title={confirmClear ? 'permanently deletes every password in this tab' : undefined}
        >
          {confirmClear ? 'click again to clear' : 'clear'}
        </ButtonGroupButton>
      </ButtonGroup>
      <SettingsButton>
        <Link to="/generator">
          <Button>Generator</Button>
        </Link>
        <Link to="/settings">
          <Button>Settings</Button>
        </Link>
      </SettingsButton>
    </Page>
  );
};

export { App };
