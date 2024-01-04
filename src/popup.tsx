import React, { useState, useEffect } from 'react';
import { genpw } from '@rolandwarburton/pwgen';

const App = () => {
  const [password, setPassword] = useState('');
  const [passwords, setPasswords] = useState<{ password: string; note: string }[]>([]);

  useEffect(() => {
    // set the temp password
    setPassword('');

    // get the password from storage (set if its not stored)
    chrome.storage.local.get('passwords', async (result) => {
      if (Object.keys(result).length !== 0) {
        // JSON.parse(result.passwords);
        setPasswords(JSON.parse(result.passwords));
      } else {
        const newPassword = await genpw();
        const updatedPasswords = [{ password: newPassword, note: '' }, ...passwords];
        chrome.storage.local.set({ passwords: JSON.stringify(updatedPasswords) }, () => {
          setPasswords(updatedPasswords);
        });
      }
    });
  }, []);

  const pushNewPassword = async () => {
    if (password === '') {
      return;
    }

    chrome.storage.local.remove('passwords');
    setPasswords([{ password, note: '' }, ...passwords].slice(0, 5));
    chrome.storage.local.set({ passwords: JSON.stringify(passwords) });
  };

  const generate = async () => {
    setPassword(await genpw());
  };

  const clear = () => {
    chrome.storage.local.remove('passwords');
    setPasswords([]);
  };

  const updateNote = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const updatedPasswords = [...passwords];
    updatedPasswords[index].note = event.target.value;
    setPasswords(updatedPasswords);
    chrome.storage.local.set({ passwords: JSON.stringify(passwords) });
  };

  return (
    <div>
      password: {password}
      {passwords.map((password, index) => (
        <div key={index}>
          {password.password}
          <input type="text" placeholder="note" value={password.note} onChange={(e) => updateNote(e, index)}></input>
        </div>
      ))}
      <div>
        <button onClick={generate}>generate</button>
        <button onClick={pushNewPassword}>Add to list</button>
        <button onClick={clear}>clear</button>
      </div>
    </div>
  );
};

export { App };
