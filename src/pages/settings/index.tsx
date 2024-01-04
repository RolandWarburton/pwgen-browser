import React, { useEffect, useState, FormEventHandler } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormLabel, FormInput, Form } from '../../components/styles';

const defaultSettings = {
  minLength: 3,
  maxLength: 5,
  numberOfWords: 2,
  count: 1,
  delimiter: '-',
  prepend: '',
  append: '-secret'
};

function setDefaultSettings(
  setFunc: React.Dispatch<
    React.SetStateAction<{
      minLength: number;
      maxLength: number;
      numberOfWords: number;
      count: number;
      delimiter: string;
      prepend: string;
      append: string;
    }>
  >
) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'number' | 'string') => {
    const { name, value } = e.target;
    if (type === 'number') {
      const valueNumber = parseInt(value);
      setSettings({ ...settings, [name]: valueNumber });
    } else {
      setSettings({ ...settings, [name]: value });
    }
  };

  const handleFormSubmit = (e: any) => {
    e.preventDefault();
    chrome.storage.local.set({settings});
  };

  return (
    <div>
      <Link to="/">
        <Button>Back</Button>
      </Link>
      <Form onSubmit={handleFormSubmit}>
        <div>
          <FormLabel>Min Length:</FormLabel>
          <FormInput
            type="number"
            name="minLength"
            value={settings.minLength}
            onChange={(e) => {
              handleInputChange(e, 'number');
            }}
          />
        </div>
        <div>
          <FormLabel>Max Length:</FormLabel>
          <FormInput
            type="number"
            name="maxLength"
            value={settings.maxLength}
            onChange={(e) => {
              handleInputChange(e, 'number');
            }}
          />
        </div>
        <div>
          <FormLabel>Number of Words:</FormLabel>
          <FormInput
            type="number"
            name="numberOfWords"
            value={settings.numberOfWords}
            onChange={(e) => {
              handleInputChange(e, 'number');
            }}
          />
        </div>
        <div>
          <FormLabel>Delimiter:</FormLabel>
          <FormInput
            type="text"
            name="delimiter"
            value={settings.delimiter}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </div>
        <div>
          <FormLabel>Prepend:</FormLabel>
          <FormInput
            type="text"
            name="prepend"
            value={settings.prepend}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </div>
        <div>
          <FormLabel>Append:</FormLabel>
          <FormInput
            type="text"
            name="append"
            value={settings.append}
            onChange={(e) => {
              handleInputChange(e, 'string');
            }}
          />
        </div>
        <Button type="submit">Save Settings</Button>
      </Form>
      {settings['minLength']}
    </div>
  );
}

export { Settings };
