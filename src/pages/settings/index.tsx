import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button, FormLabel, FormInput, Form, SaveButton, Row } from '@components/styles/index.ts';
import { defaultSettings, getSettings, saveSettings } from '@/storage/index.ts';
import { signIn, signOut } from '@/openbao/auth.ts';
import { useBaoSession } from '@/openbao/session.ts';

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

  return (
    <div>
      <Link to="/">
        <Button>Back</Button>
      </Link>
      <Form onSubmit={handleFormSubmit}>
        <Row>
          <FormLabel>Min Length:</FormLabel>
          <FormInput
            type="number"
            name="minLength"
            min={1}
            max={15}
            value={settings.minLength}
            onChange={(e) => {
              handleInputChange(e, 'number');
            }}
          />
        </Row>
        <Row>
          <FormLabel>Max Length:</FormLabel>
          <FormInput
            type="number"
            name="maxLength"
            min={1}
            max={15}
            value={settings.maxLength}
            onChange={(e) => {
              handleInputChange(e, 'number');
            }}
          />
        </Row>
        <Row>
          <FormLabel>Number of Words:</FormLabel>
          <FormInput
            type="number"
            name="numberOfWords"
            min={1}
            max={6}
            value={settings.numberOfWords}
            onChange={(e) => {
              handleInputChange(e, 'number');
            }}
          />
        </Row>
        <Row>
          <FormLabel>Delimiter:</FormLabel>
          <FormInput
            type="text"
            name="delimiter"
            max={15}
            value={settings.delimiter}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </Row>
        <Row>
          <FormLabel>Prepend:</FormLabel>
          <FormInput
            type="text"
            name="prepend"
            maxLength={15}
            value={settings.prepend}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </Row>
        <Row>
          <FormLabel>Append:</FormLabel>
          <FormInput
            type="text"
            name="append"
            maxLength={15}
            value={settings.append}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </Row>
        <Row>
          <FormLabel>OpenBao:</FormLabel>
          {/* read-only: set by BAO_ADDR at build time */}
          <div>{settings.baoAddress}</div>
        </Row>
        <Row>
          <FormLabel>Mount:</FormLabel>
          <FormInput
            type="text"
            name="baoMount"
            value={settings.baoMount}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </Row>
        <Row>
          <FormLabel>Base path:</FormLabel>
          <FormInput
            type="text"
            name="baoBasePath"
            value={settings.baoBasePath}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </Row>
        <Row>
          <FormLabel>Role:</FormLabel>
          <FormInput
            type="text"
            name="baoRole"
            value={settings.baoRole}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </Row>
        <Row>
          <FormLabel>{session ? `Signed in as ${session.displayName}` : 'Signed out'}</FormLabel>
          <div>
            {session ? (
              <Button type="button" onClick={handleSignOut}>
                Sign out
              </Button>
            ) : (
              <Button type="button" onClick={handleSignIn} disabled={signingIn || session === undefined}>
                {signingIn ? 'Signing in…' : 'Sign in'}
              </Button>
            )}
          </div>
        </Row>
        {session && (
          <Row>
            <FormLabel>Session ends:</FormLabel>
            <div>{new Date(session.expiresAt).toLocaleString()}</div>
          </Row>
        )}
        {baoError && (
          <Row>
            <FormLabel>Error:</FormLabel>
            <div>{baoError}</div>
          </Row>
        )}
        <SaveButton>
          <Button type="submit">Save Settings</Button>
        </SaveButton>
      </Form>
    </div>
  );
}

export { Settings };
