import React, { useState, useEffect } from 'react';
import { genpw } from '@rolandwarburton/pwgen';

const App = () => {
  const [password, setPassword] = useState('');

  useEffect(() => {
    // get the password from storage (set if its not stored)
    chrome.storage.local.get('password', async (result) => {
      if (Object.keys(result).length !== 0) {
        setPassword(result.password);
      } else {
        const newPassword = await genpw();
        localStorage.setItem('key', 'value');
        chrome.storage.local.set({ password: newPassword }, () => {
          setPassword(newPassword);
        });
      }
    });
  }, []);

  return <div>{password}</div>;
};

export { App };
