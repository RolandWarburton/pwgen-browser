import React from 'react';
import { setup } from 'goober';
import { createRoot } from 'react-dom/client';
import { createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { Settings } from './pages/settings';

setup(React.createElement);
const domNode = document.getElementById('root');
const root = createRoot(domNode as HTMLElement);

const router = createHashRouter([
  {
    path: '*',
    element: <Settings />
  }
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
