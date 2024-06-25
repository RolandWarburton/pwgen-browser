import React from 'react';
import { ISettings } from '@types';
import { ButtonGroup, ButtonGroupButton, Container } from '@/components/styles';
import { genpw } from '@rolandwarburton/pwgen';
import { getSettings } from '../settings';


function Generator() {
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const [settings, setSettings] = React.useState<ISettings | false>(false);

  React.useEffect(() => {
    Promise.all([getSettings()])
      .then((result) => {
        const [settings] = result;
        setSettings(settings);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  const generate = async () => {
    if (!settings) {
      return;
    }
    const newPassword = await genpw(settings);
    if (passwordRef.current?.innerHTML) {
      passwordRef.current.innerText = newPassword;
    }
    if (passwordRef.current) {
      passwordRef.current.value = newPassword;
    }
  };

  const copy = async () => { };

  return (
    <Container>
      <ButtonGroup>
        <ButtonGroupButton onClick={generate}>Generate</ButtonGroupButton>
        <ButtonGroupButton onClick={copy}>Copy</ButtonGroupButton>
      </ButtonGroup>
      <div ref={passwordRef}>Nothing generated yet</div>
    </Container>
  );
}

export default Generator;
