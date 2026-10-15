interface Props {
  flagged?: boolean;
}

const IconFlag = (props: Props) => {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 21V4M5 4h14l-3 4.5 3 4.5H5" style={{ fill: props.flagged ? 'currentColor' : 'none' }} />
    </svg>
  );
};

export { IconFlag };
