interface Props {
  // the password is hidden: the eye is crossed out
  hidden: boolean;
}

const IconEye = (props: Props) => {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {props.hidden && <path d="M3 3l18 18" />}
    </svg>
  );
};

export { IconEye };
