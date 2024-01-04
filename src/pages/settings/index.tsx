import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/styles';

function setDefaultSettings(setFunc: React.Dispatch<React.SetStateAction<{}>>) {
  console.log('settings default settings');
  const settings = {
    append: '-secret'
  };
  chrome.storage.local.set({ settings }, () => {
    setFunc(settings);
  });
}

function Settings() {
  const [settings, setSettings] = useState({});

  useState(() => {
    if (Object.keys(settings).length === 0) {
      chrome.storage.local.get('settings', (result) => {
        if (result.settings && Object.keys(result.settings).length > 0) {
          setSettings(JSON.parse(result.settings));
        } else {
          setDefaultSettings(setSettings);
        }
      });
    } else {
      setDefaultSettings(setSettings);
    }
  });

  return (
    <div>
      <Link to="/">
        <Button>Back</Button>
      </Link>
      <div>settings not implemented yet :)</div>
      {JSON.stringify(settings)}
    </div>
  );
}

export { Settings };
