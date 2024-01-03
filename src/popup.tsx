import React, {useState, useEffect} from 'react';
import { genpw } from '@rolandwarburton/pwgen';

const App = () => {
  const [password, setPassword] = useState('');

  useEffect(() => {
    (async () => {
      setPassword(await genpw());
    })();
  }, []);

  return <div>{password}</div>;
};

export { App };
