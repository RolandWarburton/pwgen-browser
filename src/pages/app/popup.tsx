import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { genpw } from '@rolandwarburton/pwgen';
import {
  ButtonGroupButton,
  Button,
  Container,
  SettingsButton,
  ButtonGroup
} from '../../components/styles';
import { getPasswordHistory, getPasswords, getSettings } from '../settings';
import { IPassword, ISettings } from '../../types';
import Password from '../../components/password-row';

const App = () => {
  const [password, setPassword] = useState('');
  const [passwords, setPasswords] = useState<IPassword[] | false>(false);
  const [passwordHistory, setPasswordHistory] = useState<string[]>([]);
  const [settings, setSettings] = useState<ISettings | false>(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // load stuff for app to function (settings, passwords, password history)
  useEffect(() => {
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

  // when the settings are changed
  useEffect(() => {
    if (!settings) return;
    if (settings.retainLastPassword) {
      setPassword(passwordHistory.at(0) || 'no password set');
    } else {
      generate();
    }
  }, [settings]);

  // when the password history changes update it
  useEffect(() => {
    if (passwordHistory.length === 0) {
      return;
    }
    chrome.storage.local.set({ passwordHistory: JSON.stringify(passwordHistory) });
  }, [passwordHistory]);

  // when passwords list changes update it
  useEffect(() => {
    if (passwords) {
      chrome.storage.local.set({ passwords: JSON.stringify(passwords) });
    }
  }, [passwords]);

  // add a password to the list
  const pushNewPassword = async () => {
    if (password === '' || !passwords) {
      return;
    }

    const passwordListLength = settings ? settings.passwordsListMaxLength : 5;
    const newPasswords = [{ password: password, note: '' }, ...passwords].slice(
      0,
      passwordListLength
    ) as IPassword[];
    setPasswords(newPasswords);
  };

  // create a new password
  const generate = async () => {
    if (!settings) {
      return;
    }
    const newPassword = await genpw(settings);
    setPassword(newPassword);
    if (passwordRef.current) {
      passwordRef.current.value = newPassword;
    }
    if (settings.storePasswordHistory) {
      setPasswordHistory([newPassword, ...passwordHistory].slice(0, 50));
    }
  };

  // clear the passwords list
  const clear = () => {
    console.log('clearing');
    chrome.storage.local.remove('passwords');
    setPasswords([]);
  };

  // delete a password from the passwords list
  const deletePassword = (index: number) => {
    if (!passwords) {
      return;
    }
    console.log('deleting password');
    const updatedPasswords = [...passwords];
    updatedPasswords.splice(index, 1);
    setPasswords(updatedPasswords);
  };

  // update a note for a password
  const updateNote = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!passwords) {
      return;
    }
    console.log('updating note');
    const updatedPasswords = [...passwords];
    updatedPasswords[index].note = event.target.value;
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
          passwords.map((_, index) => (
            <Password
              index={index}
              passwords={passwords}
              deletePassword={deletePassword}
              updateNote={updateNote}
            />
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
