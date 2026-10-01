import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router';
import { Button, Container, Row } from '@components/styles';
import { useSearchParams } from 'react-router';

function PasswordQRCode() {
  // the password is passed as a query param rather than a path segment, because
  // react-router decodes path segments twice, which mangles passwords containing '%'
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
