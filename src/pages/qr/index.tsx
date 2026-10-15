import { useSearchParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { Brand, Container, Header, LinkButton, PageTitle, Toolbar } from '@components/styles/index.ts';
import { styled } from 'goober';

// the code stays black on white so it scans in either theme
const Code = styled('div')`
  display: grid;
  place-items: center;
  padding: 20px;
  background: #fff;
`;

function PasswordQRCode() {
  // query param, not path: react-router double-decodes paths, mangling '%'
  const [searchParams] = useSearchParams();
  const password = searchParams.get('password');
  const back = searchParams.get('back');
  return (
    <>
      <Header>
        <Brand>pwgen</Brand>
      </Header>
      <Container>
        <Toolbar>
          <LinkButton to={`/${back || ''}`}>← Passwords</LinkButton>
        </Toolbar>
        <PageTitle>QR code</PageTitle>
        <Code>
          <QRCodeSVG value={password || 'NO PASSWORD SET'} width="100%" height="280px" fgColor="#121212" />
        </Code>
      </Container>
    </>
  );
}

export { PasswordQRCode };
