import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { genpw } from '@rolandwarburton/pwgen';
import {
  ButtonGroupButton,
  Button,
  Container,
  Row,
  NoteCell,
  SettingsButton,
  ButtonGroup
} from '../../components/styles';

const App = () => {
  const [password, setPassword] = useState('');
  const [passwords, setPasswords] = useState<{ password: string; note: string }[]>([]);

  useEffect(() => {
    // get the password from storage (set if its not stored)
    chrome.storage.local.get('passwords', async (result) => {
      if (Object.keys(result).length !== 0) {
        setPasswords(JSON.parse(result.passwords));
      }
      generate();
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
    chrome.storage.local.get('settings', async (result) => {
      if (result.settings && Object.keys(result.settings).length > 0) {
        setPassword(await genpw(result.settings));
      } else {
        setPassword(await genpw());
      }
    });
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
          <Row key={index}>
            {password.password}
            <NoteCell
              type="text"
              placeholder="note"
              value={password.note}
              onChange={(e) => updateNote(e, index)}
            />
          </Row>
        ))}
      </Container>
      <ButtonGroup>
        <ButtonGroupButton onClick={generate}>generate</ButtonGroupButton>
        <ButtonGroupButton onClick={pushNewPassword}>Add to list</ButtonGroupButton>
        <ButtonGroupButton onClick={clear}>clear</ButtonGroupButton>
      </ButtonGroup>
      <SettingsButton>
        <Link to="/settings">
          <Button>Settings</Button>
        </Link>
      </SettingsButton>
    </div>
  );
};

export { App };
