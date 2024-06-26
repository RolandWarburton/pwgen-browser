import React from 'react';
import { ISettings } from '@types';
import { Button, ButtonGroup, ButtonGroupButton, SettingsButton } from '@/components/styles';
import { genpw } from '@rolandwarburton/pwgen';
import { getPasswordHistory, getSettings } from '../settings';
import { GeneratorContainer, Container, Password } from './styles';
import { Link, useSearchParams } from 'react-router-dom';

function Generator() {
  const passwordRef = React.useRef<HTMLSpanElement>(null);
  const [settings, setSettings] = React.useState<ISettings | false>(false);
  const [passwordHistory, setPasswordHistory] = React.useState<string[]>([]);
  const [searchParams] = useSearchParams();
  const back = searchParams.get('back');

  React.useEffect(() => {
    Promise.all([getSettings(), getPasswordHistory()])
      .then((result) => {
        const [settings, passwordHistory] = result;
        setSettings(settings);
        if (settings.storePasswordHistory && passwordHistory.length > 0) {
          setPasswordHistory(passwordHistory);
        }
        if (passwordRef.current?.innerText) {
          passwordRef.current.innerText = passwordHistory.at(0) || 'Nothing generated yet';
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  // when the password history changes update it
  React.useEffect(() => {
    console.log(passwordHistory);
    if (passwordHistory.length === 0) {
      return;
    }
    chrome.storage.local.set({ passwordHistory: JSON.stringify(passwordHistory) });
    console.log(`saved ${passwordHistory.length} items to password history`);
  }, [passwordHistory]);

  const generate = async () => {
    if (!settings) {
      return;
    }
    const newPassword = await genpw(settings);
    if (passwordRef.current?.innerText) {
      passwordRef.current.innerText = newPassword;
    }
    if (settings.storePasswordHistory) {
      setPasswordHistory([newPassword, ...passwordHistory].slice(0, 50));
    }
  };

  const copy = async () => {
    if (passwordRef.current?.innerText) {
      const newPassword = passwordRef.current.innerText;
      navigator.clipboard.writeText(newPassword).catch((error) => {
        console.error('Unable to copy to clipboard:', error);
      });
      if (settings && settings.storePasswordHistory) {
        setPasswordHistory([newPassword, ...passwordHistory].slice(0, 50));
      }
    }
  };

  return (
    <Container>
      <GeneratorContainer>
      <ButtonGroup>
        <ButtonGroupButton onClick={generate}>Generate</ButtonGroupButton>
        <ButtonGroupButton onClick={copy}>Copy</ButtonGroupButton>
      </ButtonGroup>
        <Password>
          <span ref={passwordRef}>Nothing generated yet</span>
        </Password>
      </GeneratorContainer>
      <SettingsButton>
        <Link to={`/${back || ''}`}>
          <Button>Back</Button>
        </Link>
        <Link to="/settings">
          <Button>Settings</Button>
        </Link>
      </SettingsButton>
    </Container>
  );
}

export default Generator;
