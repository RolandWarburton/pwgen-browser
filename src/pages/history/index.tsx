import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, SVGHover, Row } from '@components/styles';
import { IconCopy } from '@components/icons/copy';
import { useNavigate } from 'react-router-dom';
import { IconQR } from '@components/icons/qr';

function History() {
  const navigate = useNavigate();
  const [passwordHistory, setPasswordHistory] = useState<string[]>([]);

  useEffect(() => {
    // get the password password history
    chrome.storage.local.get('passwordHistory', (result) => {
      if (Object.keys(result).length !== 0 && typeof result.passwordHistory == 'string') {
        console.log('setting password history');
        const temp = JSON.parse(result.passwordHistory) as string[];
        setPasswordHistory(temp);
      }
    });
  }, []);

  const clearHistory = () => {
    chrome.storage.local.remove('passwordHistory');
    setPasswordHistory([]);
  };

  return (
    <div>
      <Link to="/">
        <Button>Back</Button>
      </Link>
      <Button onClick={clearHistory}>clear history</Button>
      {passwordHistory.length > 0
        ? passwordHistory.map((password, index) => {
          return (
            <Row key={index} columns="1fr auto auto 2fr">
              {password}
              <SVGHover
                onClick={() => {
                  navigator.clipboard.writeText(password).catch((error) => {
                    console.error('Unable to copy to clipboard:', error);
                  });
                }}
              >
                <IconCopy />
              </SVGHover>
              <SVGHover
                onClick={() => {
                  navigate(`/qr/${password}?back=history`);
                }}
              >
                <IconQR />
              </SVGHover>
            </Row>
          );
        })
        : 'no passwords generated yet'}
    </div>
  );
}

export { History };
