import React from 'react';
import { setup } from 'goober';
import { createRoot } from 'react-dom/client';
import { createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { App } from './pages/app/popup.tsx';
import { Settings } from './pages/settings/index.tsx';
import { PasswordQRCode } from './pages/qr/index.tsx';
import Generator from './pages/generator/index.tsx';
import { getSettings } from './storage/index.ts';
import { renewIfNeeded } from './openbao/auth.ts';

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
