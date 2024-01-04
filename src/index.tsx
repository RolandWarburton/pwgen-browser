import React from 'react'
// import * as React from 'react';
// import 'react'
import { setup } from 'goober';
import { createRoot } from 'react-dom/client';
import { App } from './popup';

setup(React.createElement);
const domNode = document.getElementById('root');
const root = createRoot(domNode as HTMLElement);

root.render(<App />);
