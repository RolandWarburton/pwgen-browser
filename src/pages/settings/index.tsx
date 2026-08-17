import React, { useEffect, useState } from 'react';
import { Button, FormLabel, FormInput, FormSelect, Form, SaveButton, Row } from '@components/styles';
import { defaultSettings, getSettings, saveSettings } from '@/storage';
import { hasVIADevice, getMacroCount, FALLBACK_MACRO_COUNT } from '../../utils/via';

function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [keyboardStatus, setKeyboardStatus] = useState('');
  const [macroCount, setMacroCount] = useState(FALLBACK_MACRO_COUNT);

  useEffect(() => {
    const doAsync = async () => {
      const settings = await getSettings();
      setSettings(settings);
      const paired = await hasVIADevice();
      setKeyboardStatus(paired ? 'Paired' : 'Not paired');
      if (!paired) return;
      try {
        setMacroCount(await getMacroCount());
      } catch (err) {
        console.error('Unable to read macro count:', err);
      }
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
        <Row>
          <FormLabel>VIA Keyboard:</FormLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button type="button" onClick={() => {
              chrome.tabs.create({ url: chrome.runtime.getURL('pair.html') });
            }}>Pair</Button>
            <span>{keyboardStatus}</span>
          </div>
        </Row>
        <Row>
          <FormLabel>Macro Slot:</FormLabel>
          <FormSelect
            name="macroSlot"
            value={settings.macroSlot}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setSettings({ ...settings, macroSlot: parseInt(e.target.value) });
            }}
          >
            {/* A saved slot beyond the reported count still needs an entry, or
                the select would render blank and silently change the setting. */}
            {Array.from(
              { length: Math.max(macroCount, settings.macroSlot + 1) },
              (_unused, i) => (
                <option key={i} value={i}>
                  {`M${i}${i >= macroCount ? ' (not on this keyboard)' : ''}`}
                </option>
              )
            )}
          </FormSelect>
        </Row>
        <SaveButton>
          <Button type="submit">Save Settings</Button>
        </SaveButton>
      </Form>
    </div>
  );
}

export { Settings };
