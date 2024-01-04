import React, { useState, useEffect } from 'react';
import { genpw } from '@rolandwarburton/pwgen';
import {
  ButtonGroupButton,
  Button,
  Container,
  PasswordRow,
  NoteCell,
  SettingsButton,
  ButtonGroup
} from '../../components/styles';

const App = () => {
  const [password, setPassword] = useState('');
  const [passwords, setPasswords] = useState<{ password: string; note: string }[]>([]);

  useEffect(() => {
    // set the temp password
    setPassword('');

    // get the password from storage (set if its not stored)
    chrome.storage.local.get('passwords', async (result) => {
      if (Object.keys(result).length !== 0) {
        setPasswords(JSON.parse(result.passwords));
      }
      setPassword(await genpw());
    });
  }, []);

  const pushNewPassword = async () => {
    if (password === '') {
      return;
    }

    chrome.storage.local.remove('passwords');
    setPasswords([{ password: password, note: '' }, ...passwords].slice(0, 5));
    chrome.storage.local.set({
      passwords: JSON.stringify([{ password: password, note: '' }, ...passwords])
    });
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
      <Container>
        password: <input readOnly defaultValue={password} />
        {passwords.map((password, index) => (
          <PasswordRow key={index}>
            {password.password}
            <NoteCell
              type="text"
              placeholder="note"
              value={password.note}
              onChange={(e) => updateNote(e, index)}
            />
          </PasswordRow>
        ))}
      </Container>
      <div>
        <button onClick={generate}>generate</button>
        <button onClick={pushNewPassword}>Add to list</button>
        <button onClick={clear}>clear</button>
      </div>
    </div>
  );
};

export { App };
