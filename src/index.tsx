import React from 'react'
// import * as React from 'react';
// import 'react'
import { createRoot } from 'react-dom/client';
import { App } from './popup';
const domNode = document.getElementById('root');
const root = createRoot(domNode as HTMLElement);

root.render(<App />);
