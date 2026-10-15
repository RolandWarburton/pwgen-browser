import React from 'react';
import { useSearchParams } from 'react-router';
// @ts-types="../../types/pwgen.d.ts"
import { genpw } from '@rolandwarburton/pwgen';
import {
  Brand,
  Button,
  Card,
  Container,
  Fact,
  Facts,
  Header,
  Label,
  LinkButton,
  PageTitle,
  Toolbar
} from '@/components/styles/index.ts';
import { getSettings } from '@/storage/index.ts';
import { ISettings } from '@types';
import { Passphrase } from './styles.tsx';

// how long the Copy button reads "Copied"
const COPIED_DELAY = 1000;

function Generator() {
  const [settings, setSettings] = React.useState<ISettings | false>(false);
  const [password, setPassword] = React.useState('');
  const [copied, setCopied] = React.useState(false);
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
      navigator.clipboard
        .writeText(password)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), COPIED_DELAY);
        })
        .catch((error) => {
          console.error('Unable to copy to clipboard:', error);
        });
    }
  };

  return (
    <>
      <Header>
        <Brand>pwgen</Brand>
      </Header>
      <Container>
        <Toolbar>
          <LinkButton to={`/${back || ''}`}>← Passwords</LinkButton>
          <LinkButton to="/settings">Settings</LinkButton>
        </Toolbar>
        <PageTitle>Generator</PageTitle>
        <Card>
          <div>
            <Label as="span">Password</Label>
            <Passphrase>{password || 'Nothing generated yet'}</Passphrase>
          </div>
          <div style={{ display: 'flex', gap: 'var(--gap)' }}>
            <Button data-kind="primary" onClick={generate}>
              Generate
            </Button>
            <Button onClick={copy} disabled={!password}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </Card>
        {settings && (
          <Facts aria-label="Generator options">
            <Fact>
              <dt>Words</dt>
              <dd>{settings.numberOfWords}</dd>
            </Fact>
            <Fact>
              <dt>Word length</dt>
              <dd>
                {settings.minLength} to {settings.maxLength}
              </dd>
            </Fact>
            <Fact>
              <dt>Delimiter</dt>
              <dd>{settings.delimiter || 'none'}</dd>
            </Fact>
            <Fact>
              <dt>Prepend</dt>
              <dd>{settings.prepend || 'none'}</dd>
            </Fact>
            <Fact>
              <dt>Append</dt>
              <dd>{settings.append || 'none'}</dd>
            </Fact>
          </Facts>
        )}
      </Container>
    </>
  );
}

export default Generator;
