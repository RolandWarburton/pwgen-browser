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
import { IPasswords, ISettings, getPasswordHistory, getPasswords, getSettings } from '../settings';
import { IconTrash } from './trash';

const App = () => {
  const [password, setPassword] = useState('');
  const [passwords, setPasswords] = useState<IPasswords | false>(false);
  const [passwordHistory, setPasswordHistory] = useState<string[]>([]);
  const [settings, setSettings] = useState<ISettings | false>(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // const doAsync = async () => {
    Promise.all([getSettings(), getPasswords(), getPasswordHistory()])
      .then((result) => {
        const [settings, passwords, passwordHistory] = result;
        setSettings(settings);
        setPasswords(passwords);

        if (settings.storePasswordHistory && passwordHistory.length > 0) {
          setPasswordHistory(passwordHistory);
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  useEffect(() => {
    if (!settings) return;
    if (settings.retainLastPassword) {
      setPassword(passwordHistory.at(0) || 'no password set');
    } else {
      generate();
    }
  }, [settings]);

  useEffect(() => {
    if (passwordHistory.length === 0) {
      return;
    }
    chrome.storage.local.set({ passwordHistory: JSON.stringify(passwordHistory) });
  }, [passwordHistory]);

  useEffect(() => {
    if (passwords) {
      chrome.storage.local.set({ passwords: JSON.stringify(passwords) });
    }
  }, [passwords]);

  const pushNewPassword = async () => {
    if (password === '' || !passwords) {
      return;
    }

    const passwordListLength = settings ? settings.passwordsListMaxLength : 5;
    const newPasswords = [{ password: password, note: '' }, ...passwords].slice(
      0,
      passwordListLength
    ) as IPasswords;
    setPasswords(newPasswords);
  };

  const generate = async () => {
    if (!settings) {
      return;
    }
    let newPassword = '';
    newPassword = await genpw(settings);
    setPassword(newPassword);
    if (passwordRef.current) {
      passwordRef.current.value = newPassword;
    }
    if (settings.storePasswordHistory) {
      setPasswordHistory([newPassword, ...passwordHistory].slice(0, 50));
    }
  };

  const clear = () => {
    console.log('clearing');
    chrome.storage.local.remove('passwords');
    setPasswords([]);
  };

  const updateNote = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!passwords) {
      return;
    }
    console.log('updating note');
    const updatedPasswords = [...passwords];
    updatedPasswords[index].note = event.target.value;
    setPasswords(updatedPasswords);
  };

  const deletePassword = (index: number) => {
    if (!passwords) {
      return;
    }
    console.log('deleting password');
    const updatedPasswords = [...passwords];
    updatedPasswords.splice(index, 1);
    setPasswords(updatedPasswords);
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
        {passwords &&
          passwords.map((password, index) => (
            <Row key={index} columns="1fr auto auto 2fr auto">
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
              <SVGHover
                onClick={() => {
                  deletePassword(index);
                }}
              >
                <IconTrash />
              </SVGHover>
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
        {settings && settings.storePasswordHistory ? (
          <Link to="/history">
            <Button>History ({passwordHistory.length})</Button>
          </Link>
        ) : (
          ''
        )}
      </SettingsButton>
    </div>
  );
};

export { App };
