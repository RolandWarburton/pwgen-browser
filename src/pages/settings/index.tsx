import React, { useEffect, useState, FormEventHandler } from 'react';
import { Link } from 'react-router-dom';
import { Button, FormLabel, FormInput, Form, SaveButton } from '../../components/styles';
import { Row } from '../../components/styles';

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
        <SaveButton>
          <Button type="submit">Save Settings</Button>
        </SaveButton>
      </Form>
    </div>
  );
}

export { Settings };
