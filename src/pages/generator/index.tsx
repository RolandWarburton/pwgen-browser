import React from 'react';
import { ISettings } from '@types';
import { Button, ButtonGroup, ButtonGroupButton, SettingsButton } from '@/components/styles/index.ts';
// @ts-types="../../types/pwgen.d.ts"
import { genpw } from '@rolandwarburton/pwgen';
import { getSettings } from '@/storage/index.ts';
import { GeneratorContainer, Container, Password } from './styles.tsx';
import { Link, useSearchParams } from 'react-router';

function Generator() {
  const [settings, setSettings] = React.useState<ISettings | false>(false);
  const [password, setPassword] = React.useState('');
  const [searchParams] = useSearchParams();
  const back = searchParams.get('back');

  React.useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const generate = async () => {
    if (!settings) {
      return;
    }
    setPassword(await genpw(settings));
  };

  const copy = () => {
    if (password) {
      navigator.clipboard.writeText(password).catch((error) => {
        console.error('Unable to copy to clipboard:', error);
      });
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
          <span>{password || 'Nothing generated yet'}</span>
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
