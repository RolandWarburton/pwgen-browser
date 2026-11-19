import { useEffect, useRef, useState } from 'react';
import { styled } from 'goober';
// @ts-types="../../types/pwgen.d.ts"
import { genpw } from '@rolandwarburton/pwgen';
import {
  Banner,
  Brand,
  Button,
  ButtonGroup,
  ButtonGroupButton,
  Card,
  ConfirmBanner,
  Container,
  Header,
  HeaderNav,
  Input,
  LinkButton,
  List,
  NewPasswordBlock,
  SearchStatus
} from '../../components/styles/index.ts';
import { getActiveTabId, getSearchAllTabs, getSettings, saveActiveTabId, saveSearchAllTabs } from '@/storage/index.ts';
import { IPassword, ISettings, ITab } from '../../types/index.ts';
import { AuthError, ConflictError, NetworkError, NotFoundError } from '@/openbao/client.ts';
import { renewIfNeeded, signIn } from '@/openbao/auth.ts';
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
import { matches, SearchBox, SearchResult } from '@components/search/index.tsx';

const Page = styled('div')`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

interface IProblem {
  message: string;
  retry?: () => void;
}

const resultCount = (results: number, tabs: number) =>
  results === 0
    ? 'No matches in any tab'
    : `${results} ${results === 1 ? 'result' : 'results'} in ${tabs} ${tabs === 1 ? 'tab' : 'tabs'}`;

const newestFirst = (a: IPassword, b: IPassword) => b.createdTime.localeCompare(a.createdTime);

const App = () => {
  const [settings, setSettings] = useState<ISettings | null>(null);
  const session = useBaoSession();
  const signedIn = Boolean(session);
  const [password, setPassword] = useState('');
  const [newKey, setNewKey] = useState<string>();
  // a live view of OpenBao; nothing is cached locally
  const [tabs, setTabs] = useState<ITab[] | null>(null);
  const [activeTabId, setActiveTabId] = useState('');
  const [passwords, setPasswords] = useState<IPassword[] | null>(null);
  const [deletingTabId, setDeletingTabId] = useState<string | undefined>(undefined);
  const [confirmClear, setConfirmClear] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [problem, setProblem] = useState<IProblem | null>(null);
  const [query, setQuery] = useState('');
  const [searchAll, setSearchAll] = useState(false);
  // every tab's passwords, by slug, loaded for an all-tabs search
  const [allLists, setAllLists] = useState<Record<string, IPassword[]> | null>(null);
  // the password opened from an all-tabs result
  const [foundKey, setFoundKey] = useState<string>();
  // shown at once when a result opens its tab, until the tab's own load lands
  const seedList = useRef<IPassword[] | undefined>(undefined);
  const allLoadId = useRef(0);
  // async work started for one tab must not land in another
  const activeTabRef = useRef('');
  activeTabRef.current = activeTabId;
  // a load finishing after a newer one is ignored
  const loadId = useRef(0);
  const needle = query.trim().toLowerCase();
  const searchingAll = searchAll && needle !== '' && Boolean(tabs);
  const searchingAllRef = useRef(searchingAll);
  searchingAllRef.current = searchingAll;
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

  const loadEveryTab = async (settings: ISettings, tabs: ITab[]) => {
    const id = ++allLoadId.current;
    try {
      const lists = await Promise.all(tabs.map((tab) => loadPasswords(settings, tab.slug)));
      if (id === allLoadId.current) {
        setAllLists(Object.fromEntries(tabs.map((tab, i) => [tab.slug, lists[i]])));
      }
    } catch (err) {
      if (id === allLoadId.current) {
        report(err, () => loadEveryTab(settings, tabs));
      }
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
    getSearchAllTabs().then(setSearchAll);
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
      setAllLists(null);
      setActiveTabId('');
    }
  }, [settings, signedIn]);

  // load the selected tab's passwords, and remember the tab for next time
  useEffect(() => {
    if (!settings || !signedIn || !activeTabId) {
      return;
    }
    setPasswords(seedList.current ?? null);
    seedList.current = undefined;
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
        if (searchingAllRef.current) {
          setAllLists(null);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [settings, signedIn]);

  // load every tab when an all-tabs search starts (not on each keystroke); drop them after
  useEffect(() => {
    if (!searchingAll) {
      allLoadId.current++;
      setAllLists(null);
    } else if (settings && tabs && allLists === null) {
      loadEveryTab(settings, tabs);
    }
  }, [searchingAll, tabs, allLists === null]);

  const changeSearchAll = (value: boolean) => {
    setSearchAll(value);
    saveSearchAllTabs(value);
  };

  // re-reads a result's password before it is copied
  const recheckResult = async (slug: string, key: string): Promise<IPassword | null> => {
    if (!settings) {
      return null;
    }
    const replace = (list: IPassword[], current: IPassword | null) =>
      current ? list.map((item) => (item.key === key ? current : item)) : list.filter((item) => item.key !== key);
    try {
      const current = await loadPassword(settings, slug, key);
      setAllLists((lists) => (lists && lists[slug] ? { ...lists, [slug]: replace(lists[slug], current) } : lists));
      updateList(slug, (list) => replace(list, current));
      if (!current) {
        setProblem({ message: 'That password was deleted elsewhere.' });
      }
      return current;
    } catch (err) {
      report(err);
      return null;
    }
  };

  // from an all-tabs result: open its tab in the usual order, then scroll to it and flash it
  const openResult = (slug: string, key: string) => {
    setQuery('');
    setFoundKey(key);
    if (slug !== activeTabId) {
      seedList.current = allLists?.[slug];
      setActiveTabId(slug);
    }
  };

  const selectTab = (slug: string) => {
    if (searchingAll) {
      setQuery('');
    }
    setFoundKey(undefined);
    setActiveTabId(slug);
  };

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
    updateList(
      slug,
      (list) =>
        update ? list.map((item) => (item.key === key ? update(item) : item)) : list.filter((item) => item.key !== key)
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
      updateList(slug, (list) => [...list.filter((item) => item.key !== key), original].sort(newestFirst));
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
      setNewKey(added.key);
      setProblem(null);
    } catch (err) {
      report(err);
    } finally {
      setSaving(false);
    }
  };

  // permanent; confirmed in a banner because confirm() would freeze the panel
  const clear = async () => {
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
    const showRow = (row: IPassword) => updateList(slug, (list) => list.map((item) => (item.key === key ? row : item)));
    showRow({ ...original, password: value });
    try {
      const version = await updatePassword(settings, slug, key, value, original.version);
      showRow({ ...original, password: value, version });
      setProblem(null);
    } catch (err) {
      if (err instanceof ConflictError) {
        if (await recheck(key)) {
          setProblem({
            message: 'That password was changed elsewhere, so it has been reloaded. Make your change again.'
          });
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

  const activeTab = tabs?.find((tab) => tab.slug === activeTabId);
  const shown = passwords && needle ? passwords.filter((item) => matches(item, needle)) : (passwords ?? []);
  // in tab order; the open tab's own list is the live one
  const allResults = searchingAll && tabs && allLists
    ? tabs.flatMap((tab) =>
      ((tab.slug === activeTabId && passwords) || allLists[tab.slug] || [])
        .filter((item) => matches(item, needle))
        .map((item) => ({ tab, item }))
    )
    : [];

  return (
    <Page>
      <Header>
        <Brand>pwgen</Brand>
        <HeaderNav>
          <LinkButton to='/generator'>Generator</LinkButton>
          <LinkButton to='/settings'>Settings</LinkButton>
        </HeaderNav>
      </Header>
      <Container>
        {tabs && (
          <Tabs
            tabs={tabs}
            // an all-tabs search isn't any one tab
            activeTabId={searchingAll ? '' : activeTabId}
            passwordCount={passwords?.length}
            deletingId={deletingTabId}
            selectTab={selectTab}
            addTab={addTab}
            deleteTab={deleteTab}
            renameTab={renameTab}
          />
        )}
        {signedIn && tabs && (
          <SearchBox query={query} allTabs={searchAll} setQuery={setQuery} setAllTabs={changeSearchAll} />
        )}
        {signedIn && tabs && needle !== '' && (
          <SearchStatus role='status'>
            {searchingAll
              ? (
                allLists === null
                  ? (
                    `Searching ${tabs.length} ${tabs.length === 1 ? 'tab' : 'tabs'}…`
                  )
                  : (
                    resultCount(allResults.length, new Set(allResults.map((result) => result.tab.slug)).size)
                  )
              )
              : (
                passwords && (
                  <>
                    <span>
                      {shown.length} of {passwords.length} in “{activeTab?.name}”
                    </span>
                    {shown.length === 0 && tabs.length > 1 && (
                      <button
                        type='button'
                        onClick={() => changeSearchAll(true)}
                      >
                        Search all tabs
                      </button>
                    )}
                  </>
                )
              )}
          </SearchStatus>
        )}
        <NewPasswordBlock data-dim={searchingAll} inert={searchingAll}>
          <Card style={{ gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center' }}>
            <ButtonGroupButton onClick={() => generate()}>Generate</ButtonGroupButton>
            <Input
              id='new-password'
              aria-label='Password'
              data-mono='true'
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPassword(e.target.value);
              }}
            />
          </Card>
          <ButtonGroup style={{ padding: 0 }}>
            <ButtonGroupButton
              data-kind='primary'
              onClick={pushNewPassword}
              disabled={!signedIn || !activeTabId || saving}
            >
              {saving ? 'Saving…' : 'Add to list'}
            </ButtonGroupButton>
            <ButtonGroupButton
              data-kind='hot-text'
              onClick={() => setConfirmClear(true)}
              disabled={!passwords || passwords.length === 0}
            >
              Clear…
            </ButtonGroupButton>
          </ButtonGroup>
        </NewPasswordBlock>
        {confirmClear && passwords && passwords.length > 0 && (
          <ConfirmBanner role='alertdialog' aria-label='Confirm clear tab'>
            <span>
              <strong>Clear “{activeTab?.name}”?</strong> This permanently removes {passwords.length}{' '}
              {passwords.length === 1 ? 'password' : 'passwords'} from OpenBao.
            </span>
            <div>
              <button
                type='button'
                onClick={() =>
                  setConfirmClear(false)}
              >
                Cancel
              </button>
              <button type='button' onClick={clear}>
                Clear tab
              </button>
            </div>
          </ConfirmBanner>
        )}
        {problem && (
          <Banner data-kind='error'>
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
            <Button data-kind='primary' onClick={handleSignIn} disabled={signingIn || !settings}>
              {signingIn ? 'Signing in…' : 'Sign in'}
            </Button>
          </Banner>
        )}
        {signedIn && activeTabId && passwords === null && !searchingAll && <Banner>Loading…</Banner>}
        {searchingAll && allLists && (
          <List>
            {allResults.map(({ tab, item }) => (
              <SearchResult
                key={`${tab.slug}/${item.key}`}
                tab={tab}
                password={item}
                query={needle}
                recheck={recheckResult}
                openTab={openResult}
              />
            ))}
          </List>
        )}
        {!searchingAll && passwords && (
          <List>
            {shown.map((item) => (
              <Password
                key={item.key}
                password={item}
                deletePassword={deletePassword}
                updateNote={updateNote}
                flagPassword={flagPassword}
                hidePassword={hidePassword}
                savePassword={savePassword}
                recheck={recheck}
                isNew={item.key === newKey}
                isFound={item.key === foundKey}
                foundShown={() => setFoundKey(undefined)}
              />
            ))}
          </List>
        )}
      </Container>
    </Page>
  );
};

export { App };
