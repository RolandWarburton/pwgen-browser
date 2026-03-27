import React from 'react';

const IconKeyboard = () => {
  return (
    <div
      style={{ padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="25"
        height="25"
        fill="none"
        viewBox="0 0 24 24"
      >
        <rect
          x="2"
          y="5"
          width="20"
          height="14"
          rx="2"
          stroke="#1C274C"
          strokeWidth="1.5"
        />
        <path
          stroke="#1C274C"
          strokeWidth="1.5"
          strokeLinecap="round"
          d="M6 9h1M10 9h1M14 9h1M6 12h1M10 12h1M14 12h1M18 9h1M8 15h8"
        />
      </svg>
    </div>
  );
};

export { IconKeyboard };
