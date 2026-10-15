import React, { useEffect, useState } from 'react';
import {
  Banner,
  Brand,
  Button,
  Card,
  Fact,
  Facts,
  Form,
  Header,
  Input,
  Label,
  LinkButton,
  PageTitle,
  SectionHead,
  Toolbar
} from '@components/styles/index.ts';
import { styled } from 'goober';
import { defaultSettings, getSettings, saveSettings } from '@/storage/index.ts';
import { signIn, signOut } from '@/openbao/auth.ts';
import { useBaoSession } from '@/openbao/session.ts';

const Pair = styled('div')`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
`;

function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const session = useBaoSession();
  const [signingIn, setSigningIn] = useState(false);
  const [baoError, setBaoError] = useState('');

  useEffect(() => {
    const doAsync = async () => {
      const settings = await getSettings();
      setSettings(settings);
    };
    doAsync();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'number' | 'string' | 'boolean'
  ) => {
    const { name, value, checked } = e.target;
    if (type === 'number') {
      const valueNumber = parseInt(value);
      setSettings({ ...settings, [name]: valueNumber });
    } else if (type === 'string') {
      setSettings({ ...settings, [name]: value });
    } else {
      setSettings({ ...settings, [name]: checked });
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveSettings(settings);
  };

  const handleSignIn = async () => {
    setBaoError('');
    setSigningIn(true);
    try {
      // save first so the panel uses the role signed in with
      saveSettings(settings);
      await signIn(settings);
    } catch (err) {
      setBaoError(err instanceof Error ? err.message : String(err));
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setBaoError('');
    await signOut(settings);
  };

  const field = (
    label: string,
    name: keyof typeof settings,
    type: 'number' | 'string',
    extra: { min?: number; max?: number; maxLength?: number; mono?: boolean } = {}
  ) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type === 'number' ? 'number' : 'text'}
        data-mono={extra.mono ? 'true' : undefined}
        min={extra.min}
        max={extra.max}
        maxLength={extra.maxLength}
        value={settings[name] as string | number}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          handleInputChange(e, type);
        }}
      />
    </div>
  );

  return (
    <>
      <Header>
        <Brand>pwgen</Brand>
      </Header>
      <Form onSubmit={handleFormSubmit} style={{ padding: 8, flex: 1 }}>
        <Toolbar>
          <LinkButton to="/">← Passwords</LinkButton>
          <Button type="submit" data-kind="primary">
            Save settings
          </Button>
        </Toolbar>
        <PageTitle>Settings</PageTitle>
        <Card>
          <SectionHead>Generator</SectionHead>
          <Pair>
            {field('Min length', 'minLength', 'number', { min: 1, max: 15 })}
            {field('Max length', 'maxLength', 'number', { min: 1, max: 15 })}
          </Pair>
          {field('Number of words', 'numberOfWords', 'number', { min: 1, max: 6 })}
          <Pair>
            {field('Delimiter', 'delimiter', 'string', { maxLength: 15, mono: true })}
            {field('Prepend', 'prepend', 'string', { maxLength: 15, mono: true })}
          </Pair>
          {field('Append', 'append', 'string', { maxLength: 15, mono: true })}
        </Card>
        <Card>
          <SectionHead>OpenBao</SectionHead>
          <Facts>
            {/* read-only: set by BAO_ADDR at build time */}
            <Fact>
              <dt>Address</dt>
              <dd>{settings.baoAddress}</dd>
            </Fact>
          </Facts>
          <Pair>
            {field('Mount', 'baoMount', 'string', { mono: true })}
            {field('Base path', 'baoBasePath', 'string', { mono: true })}
          </Pair>
          {field('Role', 'baoRole', 'string', { mono: true })}
        </Card>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionHead>Session</SectionHead>
            {session ? (
              <Button type="button" onClick={handleSignOut}>
                Sign out
              </Button>
            ) : (
              <Button
                type="button"
                data-kind="primary"
                onClick={handleSignIn}
                disabled={signingIn || session === undefined}
              >
                {signingIn ? 'Signing in…' : 'Sign in'}
              </Button>
            )}
          </div>
          <Facts>
            <Fact>
              <dt>{session ? 'Signed in as' : 'Status'}</dt>
              <dd>{session ? session.displayName : 'Signed out'}</dd>
            </Fact>
            {session && (
              <Fact>
                <dt>Session ends</dt>
                <dd>{new Date(session.expiresAt).toLocaleString()}</dd>
              </Fact>
            )}
          </Facts>
          {baoError && (
            <Banner data-kind="error">
              <span>{baoError}</span>
            </Banner>
          )}
        </Card>
      </Form>
    </>
  );
}

export { Settings };
