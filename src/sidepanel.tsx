import React from 'react';
import { setup } from 'goober';
import { createRoot } from 'react-dom/client';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { Settings } from './pages/settings';

setup(React.createElement);
const domNode = document.getElementById('root');
const root = createRoot(domNode as HTMLElement);

const router = createHashRouter([
  {
    path: '*',
    element: <Settings />
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
