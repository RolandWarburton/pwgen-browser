import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { Button, Container, Row } from '../../components/styles';
import { useParams } from 'react-router-dom';

function PasswordQRCode() {
  const { param } = useParams();
  return (
    <div>
      <Container>
        <Row columns="1fr">
          <Link to="/">
            <Button>Back</Button>
          </Link>
        </Row>
        <Row columns="1fr">
          <QRCodeSVG value={param || 'NO PASSWORD SET'} width="100%" height="200px" />
        </Row>
      </Container>
    </div>
  );
}

export { PasswordQRCode };
