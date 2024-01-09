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
  ButtonGroup,
  SVGHover
} from '../../components/styles';
import { IconQR } from './qr';
import { useNavigate } from 'react-router-dom';
import { IconCopy } from './copy';
import { getSettings } from '../settings';

const App = () => {
  const [password, setPassword] = useState('');
  const [passwords, setPasswords] = useState<{ password: string; note: string }[]>([]);
  const [passwordHistory, setPasswordHistory] = useState<string[]>([]);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // set the password password history
    chrome.storage.local.get('passwordHistory', (result) => {
      if (Object.keys(result).length !== 0 && result.passwordHistory) {
        console.log('setting password history');
        setPasswordHistory(JSON.parse(result.passwordHistory));
      }
    });
  }, []);

  useEffect(() => {
    if (passwordHistory.length === 0) {
      return;
    }

    getSettings((settings) => {
      if (settings.retainLastPassword) setPassword(passwordHistory.at(-1) || 'no password set');
      else if (password === '') generate();
    });
  }, [passwordHistory]);

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
    getSettings(async (settings) => {
      let newPassword = '';
      newPassword = await genpw(settings);
      setPassword(newPassword);
      if (passwordRef.current) {
        passwordRef.current.value = newPassword;
      }
      if (settings.storePasswordHistory) {
        setPasswordHistory([newPassword, ...passwordHistory].slice(0, 50));
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
          <Row key={index} columns="1fr auto auto 2fr">
            {password.password}
            <SVGHover
              onClick={() => {
                navigator.clipboard.writeText(password.password).catch((error) => {
                  console.error('Unable to copy to clipboard:', error);
                });
              }}
            >
              <IconCopy />
            </SVGHover>
            <SVGHover
              onClick={() => {
                navigate(`/qr/${password.password}`);
              }}
            >
              <IconQR />
            </SVGHover>
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
        <Link to="/history">
          <Button>History ({passwordHistory.length})</Button>
        </Link>
      </SettingsButton>
    </div>
  );
};

export { App };
