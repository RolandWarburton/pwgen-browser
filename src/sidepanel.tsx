import React from 'react';
import { setup } from 'goober';
import { createRoot } from 'react-dom/client';
import { createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { App } from './pages/app/popup';
import { Settings } from './pages/settings';
import { PasswordQRCode } from './pages/qr';
import Generator from './pages/generator';
import { getSettings } from './storage';
import { renewIfNeeded } from './openbao/auth';

setup(React.createElement);
// renew the OpenBao token while the panel is in use
getSettings().then(renewIfNeeded);
const domNode = document.getElementById('root');
const root = createRoot(domNode as HTMLElement);

const router = createHashRouter([
  {
    path: '*',
    element: <App />
  },
  {
    path: '/settings',
    element: <Settings />
  },
  {
    path: '/qr',
    element: <PasswordQRCode />
  },
  {
    path: '/generator',
    element: <Generator />
  }
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
