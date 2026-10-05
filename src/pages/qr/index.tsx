import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router';
import { Button, Container, Row } from '@components/styles/index.ts';
import { useSearchParams } from 'react-router';

function PasswordQRCode() {
  // query param, not path: react-router double-decodes paths, mangling '%'
  const [searchParams] = useSearchParams();
  const password = searchParams.get('password');
  const back = searchParams.get('back');
  return (
    <div>
      <Container>
        <Row columns="1fr">
          <Link to={`/${back || ''}`}>
            <Button>Back</Button>
          </Link>
        </Row>
        <Row columns="1fr">
          <QRCodeSVG value={password || 'NO PASSWORD SET'} width="100%" height="200px" />
        </Row>
      </Container>
    </div>
  );
}

export { PasswordQRCode };
