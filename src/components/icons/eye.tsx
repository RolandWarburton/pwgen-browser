import React from 'react';

interface Props {
  open: boolean;
}

const IconEye = (props: Props) => {
  const { open } = props;
  if (open) {
    return (
      <svg
        width="25px"
        height="25px"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M10 22C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 18.7712 2 15"
          stroke="#1C274C"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M22 15C22 18.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22"
          stroke="#1C274C"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M14 2C17.7712 2 19.6569 2 20.8284 3.17157C22 4.34315 22 5.22876 22 9"
          stroke="#1C274C"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M10 2C6.22876 2 4.34315 2 3.17157 3.17157C2 4.34315 2 5.22876 2 9"
          stroke="#1C274C"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M5.89243 14.0598C5.29748 13.3697 5 13.0246 5 12C5 10.9754 5.29747 10.6303 5.89242 9.94021C7.08037 8.56222 9.07268 7 12 7C14.9273 7 16.9196 8.56222 18.1076 9.94021C18.7025 10.6303 19 10.9754 19 12C19 13.0246 18.7025 13.3697 18.1076 14.0598C16.9196 15.4378 14.9273 17 12 17C9.07268 17 7.08038 15.4378 5.89243 14.0598Z"
          stroke="#1C274C"
          stroke-width="1.5"
        />
        <circle cx="12" cy="12" r="2" stroke="#1C274C" stroke-width="1.5" />
      </svg>
    );
  } else {
    return (
      <svg
        width="25px"
        height="25px"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3.27489 15.2957C2.42496 14.1915 2 13.6394 2 12C2 10.3606 2.42496 9.80853 3.27489 8.70433C4.97196 6.49956 7.81811 4 12 4C16.1819 4 19.028 6.49956 20.7251 8.70433C21.575 9.80853 22 10.3606 22 12C22 13.6394 21.575 14.1915 20.7251 15.2957C19.028 17.5004 16.1819 20 12 20C7.81811 20 4.97196 17.5004 3.27489 15.2957Z"
          stroke="#1C274C"
          stroke-width="1.5"
        />
        <path
          d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"
          stroke="#1C274C"
          stroke-width="1.5"
        />
      </svg>
    );
  }
};

export { IconEye };
