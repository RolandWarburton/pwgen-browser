import React from 'react';

function IconEllipsis() {
  return (
    <div style={{ padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12.5" cy="5.5" r="1.5" fill="#1C274C" />
        <circle cx="12.5" cy="12.5" r="1.5" fill="#1C274C" />
        <circle cx="12.5" cy="19.5" r="1.5" fill="#1C274C" />
      </svg>
    </div>
  );
}

export { IconEllipsis };
