import React, { useEffect, useState, FormEventHandler } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormLabel, FormInput, Form, SaveButton } from '../../components/styles';
import { Row } from '../../components/styles';
import { IPassword, ISettings } from '../../types';

const defaultSettings: ISettings = {
  minLength: 3,
  maxLength: 5,
  numberOfWords: 2,
  count: 1,
  delimiter: '-',
  prepend: '',
  append: '-secret',
  passwordsListMaxLength: 5,
  retainLastPassword: true,
  storePasswordHistory: true
};

function setDefaultSettings(setFunc: React.Dispatch<ISettings>) {
  chrome.storage.local.set({ settings: defaultSettings }, () => {
    setFunc(defaultSettings);
  });
}

function Settings() {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    chrome.storage.local.get('settings', (result) => {
      if (result.settings && Object.keys(result.settings).length > 0) {
        setSettings(result.settings);
      } else {
        setDefaultSettings(setSettings);
      }
    });
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

  const handleFormSubmit = (e: any) => {
    e.preventDefault();
    chrome.storage.local.set({ settings });
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
          <FormLabel>passwords list length:</FormLabel>
          <FormInput
            type="number"
            name="passwordsListMaxLength"
            min={0}
            max={10}
            value={settings.passwordsListMaxLength}
            onChange={(e) => {
              handleInputChange(e, 'number');
            }}
          />
        </Row>
        <Row>
          <FormLabel>Retain password:</FormLabel>
          <FormInput
            type="checkbox"
            name="retainLastPassword"
            checked={settings.retainLastPassword}
            onChange={(e) => {
              // if retain password is checked then history needs to be enabled
              if (!e.target.checked) {
                handleInputChange(e, 'boolean');
              } else {
                setSettings({
                  ...settings,
                  retainLastPassword: true,
                  storePasswordHistory: true
                });
              }
            }}
          />
        </Row>
        <Row>
          <FormLabel>Password History:</FormLabel>
          <FormInput
            type="checkbox"
            name="storePasswordHistory"
            checked={settings.storePasswordHistory}
            onChange={(e) => {
              if (!e.target.checked) {
                setSettings({
                  ...settings,
                  storePasswordHistory: false,
                  retainLastPassword: false
                });
              } else {
                handleInputChange(e, 'boolean');
              }
            }}
          />
        </Row>
        <SaveButton>
          <Button type="submit">Save Settings</Button>
        </SaveButton>
      </Form>
    </div>
  );
}

function getSettings(): Promise<ISettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', async (result) => {
      if (result.settings) {
        const settings = result.settings as ISettings;
        resolve(settings);
      } else {
        resolve(defaultSettings);
      }
    });
  });
}

function getPasswords(): Promise<IPassword[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('passwords', async (result) => {
      if (result.passwords) {
        const passwords = JSON.parse(result.passwords) as IPassword[];
        resolve(passwords);
      } else {
        resolve([]);
      }
    });
  });
}

function getPasswordHistory(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('passwordHistory', async (result) => {
      if (result.passwordHistory) {
        const passwordHistory = JSON.parse(result.passwordHistory) as string[];
        resolve(passwordHistory);
      } else {
        resolve([]);
      }
    });
  });
}

export { Settings, getSettings, getPasswords, getPasswordHistory };
