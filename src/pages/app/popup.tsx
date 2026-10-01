import React, { useState, useEffect, useRef } from 'react';
import { styled } from 'goober';
import { Link } from 'react-router';
import { genpw } from '@rolandwarburton/pwgen';
import {
  ButtonGroupButton,
  Button,
  Container,
  SettingsButton,
  ButtonGroup,
  Row
} from '../../components/styles';
import {
  createTab,
  getActiveTabId,
  getTabs,
  getPasswordHistory,
  getSettings,
  saveActiveTabId,
  saveTabs,
  savePasswordHistory
} from '@/storage';
import { ITab, IPassword, ISettings } from '../../types';
import Password from '@components/password-row';
import Tabs from '@components/tabs';

const Page = styled('div')`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const App = () => {
  const [password, setPassword] = useState('');
  const [tabs, setTabs] = useState<ITab[] | false>(false);
  const [activeTabId, setActiveTabId] = useState('');
  const [passwordHistory, setPasswordHistory] = useState<string[]>([]);
  const [settings, setSettings] = useState<ISettings | false>(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs ? tabs.find((tab) => tab.id === activeTabId) : undefined;

  // load stuff for app to function (settings, tabs, password history)
  useEffect(() => {
    const doAsync = async () => {
      const [settings, tabs, passwordHistory] = await Promise.all([
        getSettings(),
        getTabs(),
        getPasswordHistory()
      ]);
      setTabs(tabs);
      setActiveTabId(await getActiveTabId(tabs));
      setSettings(settings);

      if (settings.storePasswordHistory && passwordHistory.length > 0) {
        setPasswordHistory(passwordHistory);
      }
    };
    doAsync().catch((error) => {
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
    savePasswordHistory(passwordHistory);
  }, [passwordHistory]);

  // when tabs change update them
  useEffect(() => {
    if (tabs) {
      saveTabs(tabs);
    }
  }, [tabs]);

  // when the active tab changes remember it for the next time the panel opens
  useEffect(() => {
    if (activeTabId) {
      saveActiveTabId(activeTabId);
    }
  }, [activeTabId]);

  // replace the passwords of the active tab, leaving the other tabs alone
  const updateActivePasswords = (update: (passwords: IPassword[]) => IPassword[]) => {
    if (!tabs) {
      return;
    }
    setTabs(
      tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, passwords: update(tab.passwords) } : tab
      )
    );
  };

  // add a password to the active tab
  const pushNewPassword = async () => {
    if (password === '' || !activeTab) {
      return;
    }

    const passwordListLength = settings ? settings.passwordsListMaxLength : 5;
    updateActivePasswords((passwords) =>
      [{ password: password, note: '', hidden: false, flagged: false }, ...passwords].slice(
        0,
        passwordListLength
      )
    );
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

  // clear the active tab's passwords list
  const clear = () => {
    updateActivePasswords(() => []);
  };

  // delete a password from the active tab
  const deletePassword = (index: number) => {
    updateActivePasswords((passwords) => passwords.filter((_, i) => i !== index));
  };

  // update a note for a password
  const updateNote = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const note = event.target.value;
    updateActivePasswords((passwords) =>
      passwords.map((password, i) => (i === index ? { ...password, note } : password))
    );
  };

  const flagPassword = (index: number) => {
    updateActivePasswords((passwords) =>
      passwords.map((password, i) =>
        i === index ? { ...password, flagged: !password.flagged } : password
      )
    );
  };

  const hidePassword = (index: number) => {
    updateActivePasswords((passwords) =>
      passwords.map((password, i) =>
        i === index ? { ...password, hidden: !password.hidden } : password
      )
    );
  };

  const addTab = () => {
    if (!tabs) {
      return;
    }
    const tab = createTab(`Tab ${tabs.length + 1}`);
    setTabs([...tabs, tab]);
    setActiveTabId(tab.id);
  };

  const deleteTab = (id: string) => {
    if (!tabs || tabs.length <= 1) {
      return;
    }
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (id === activeTabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  const renameTab = (id: string, name: string) => {
    if (!tabs) {
      return;
    }
    setTabs(tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)));
  };

  return (
    <Page>
      {tabs && (
        <Tabs
          tabs={tabs}
          activeTabId={activeTabId}
          selectTab={setActiveTabId}
          addTab={addTab}
          deleteTab={deleteTab}
          renameTab={renameTab}
        />
      )}
      <Container>
        <Row columns="auto 1fr">
          password:{' '}
          <input
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            ref={passwordRef}
            defaultValue={password}
          />
        </Row>
        {activeTab &&
          activeTab.passwords.map((_, index) => (
            <Password
              key={index}
              index={index}
              passwords={activeTab.passwords}
              deletePassword={deletePassword}
              updateNote={updateNote}
              flagPassword={flagPassword}
              hidePassword={hidePassword}
            />
          ))}
      </Container>
      <ButtonGroup>
        <ButtonGroupButton onClick={generate}>generate</ButtonGroupButton>
        <ButtonGroupButton onClick={pushNewPassword}>Add to list</ButtonGroupButton>
        <ButtonGroupButton onClick={clear}>clear</ButtonGroupButton>
      </ButtonGroup>
      <SettingsButton>
        <Link to="/generator">
          <Button>Generator</Button>
        </Link>
        {settings && settings.storePasswordHistory ? (
          <Link to="/history">
            <Button>History ({passwordHistory.length})</Button>
          </Link>
        ) : (
          ''
        )}
        <Link to="/settings">
          <Button>Settings</Button>
        </Link>
      </SettingsButton>
    </Page>
  );
};

export { App };
