import React, { useEffect, useState } from 'react';
import { Button, FormLabel, FormInput, Form, SaveButton, Row } from '@components/styles';
import { defaultSettings, getSettings, saveSettings } from '@/storage';

function Settings() {
  const [settings, setSettings] = useState(defaultSettings);

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

  return (
    <div>
      <Button onClick={() => window.close()}>Close</Button>
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
            max={50}
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

export { Settings };
