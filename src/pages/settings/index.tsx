import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/styles';

function Settings() {
  return (
    <div>
      <Link to="/">
        <Button>Back</Button>
      </Link>
      <div>settings not implemented yet :)</div>
    </div>
  );
}

export { Settings };
