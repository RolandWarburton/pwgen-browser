import React from 'react';

const IconBraces = ({ active }: { active?: boolean }) => {
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
        <path
          stroke={active ? '#d32f2f' : '#1C274C'}
          strokeWidth={active ? '2' : '1.5'}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 4H8a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1M15 4h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-1"
        />
      </svg>
    </div>
  );
};

export { IconBraces };
