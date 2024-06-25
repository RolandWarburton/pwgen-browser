// index.tsx
import React from 'react';
import { setup } from 'goober';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './pages/app/popup';
import { Settings } from './pages/settings';
import { PasswordQRCode } from './pages/qr';
import { History } from './pages/history';
import Generator from './pages/generator';

setup(React.createElement);
const domNode = document.getElementById('root');
const root = createRoot(domNode as HTMLElement);

const router = createBrowserRouter([
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
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
