// index.tsx
import React from 'react';
import { setup } from 'goober';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { App } from './pages/app/popup';
import { Settings } from './pages/settings';
import { PasswordQRCode } from './pages/qr';
import { History } from './pages/history';
import Generator from './pages/generator';

setup(React.createElement);
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
    path: '/history',
    element: <History />
  },
  {
    path: '/qr/:param',
    element: <PasswordQRCode />
  },
  {
    path: '/generator',
    element: <Generator />
  }
], {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  }
});

root.render(
  <React.StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
  </React.StrictMode>
);
