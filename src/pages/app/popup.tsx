import React, { useState, useEffect, useRef } from 'react';
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
import { IconComponent } from './qr';
import { useNavigate } from 'react-router-dom';

const App = () => {
  const [password, setPassword] = useState('');
  const [passwords, setPasswords] = useState<{ password: string; note: string }[]>([]);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
      let newPassword = '';
      if (result.settings && Object.keys(result.settings).length > 0) {
        newPassword = await genpw(result.settings);
      } else {
        newPassword = await genpw();
      }
      setPassword(newPassword);
      if (passwordRef.current) {
        passwordRef.current.value = newPassword;
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
        password:{' '}
        <input
          onChange={(e) => {
            setPassword(e.target.value);
          }}
          ref={passwordRef}
          defaultValue={password}
        />
        {passwords.map((password, index) => (
          <Row key={index} columns="1fr auto 2fr">
            {password.password}
            <div
              onClick={() => {
                navigate(`/qr/${password.password}`);
              }}
            >
              <IconComponent onClickHandler={() => { }} />
            </div>
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
