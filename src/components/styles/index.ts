import { keyframes, styled } from 'goober';
import { Link } from 'react-router';

// Flat surfaces: no borders, no rounded corners, no shadows. Blocks are told apart by fill and
// by the 2px gap the page shows through. Colours are the CSS variables in static/sidepanel.html.

const buttonBase = `
  display: inline-block;
  border: 0;
  border-radius: 0;
  padding: 10px 14px;
  background: var(--layer-2);
  color: var(--fg);
  font: 500 13px/1 var(--font-sans);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--layer-2-hover);
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }

  &[data-kind='primary'] {
    background: var(--accent);
    color: var(--on-accent);
  }

  &[data-kind='primary']:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  &[data-kind='danger'] {
    background: var(--hot);
    color: var(--on-hot);
  }

  &[data-kind='danger']:hover:not(:disabled) {
    background: var(--hot-hover);
  }

  &[data-kind='hot-text'] {
    color: var(--hot);
  }

  &[data-size='small'] {
    padding: 5px 8px;
    font-size: 11px;
  }

  svg {
    width: 14px;
    height: 14px;
    vertical-align: middle;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: square;
  }
`;

export const Button = styled('button')`
  ${buttonBase}
`;

export const LinkButton = styled(Link)`
  ${buttonBase}
`;

export const ButtonGroupButton = styled('button')`
  ${buttonBase}
  flex: 1 1 0;
  max-width: 140px;
  padding: 11px 8px;
  text-align: center;
`;

// the action bar pinned to the bottom of the panel
export const ButtonGroup = styled('div')`
  display: flex;
  gap: var(--gap);
  padding: 0 8px 8px;
`;

export const Header = styled('header')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--inverse);
  color: var(--on-inverse);

  a,
  button {
    background: transparent;
    color: var(--on-inverse);
  }

  a:hover,
  button:hover:not(:disabled) {
    background: var(--inverse-hover);
  }
`;

export const Brand = styled('h1')`
  margin: 0;
  font: 700 18px/1 var(--font-sans);
  letter-spacing: -0.02em;
`;

export const HeaderNav = styled('nav')`
  display: flex;
  gap: var(--gap);
`;

// Back on the left, an action on the right
export const Toolbar = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const PageTitle = styled('h2')`
  margin: 0;
  font: 700 22px/1.1 var(--font-sans);
  letter-spacing: -0.025em;
`;

// the page body below the header
export const Container = styled('div')`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
`;

export const Card = styled('div')`
  display: grid;
  gap: 12px;
  padding: 8px 12px;
  background: var(--layer);
`;

export const Label = styled('label')`
  display: block;
  font: 600 10px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
`;

export const SectionHead = styled('h3')`
  margin: 0;
  font: 700 12px/1 var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

export const Input = styled('input')`
  width: 100%;
  min-width: 0;
  padding: 7px 10px;
  border: 0;
  border-radius: 0;
  background: var(--layer-2);
  color: var(--fg);
  font: 400 13px/1.2 var(--font-sans);

  &::placeholder {
    color: var(--muted);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }

  &[data-mono='true'] {
    font-family: var(--font-mono);
  }
`;

export const Form = styled('form')`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

// label/value box on the page ground
export const Fact = styled('div')`
  background: var(--bg);
  padding: 10px 12px;
  min-width: 0;
  overflow-wrap: anywhere;

  dt {
    margin-bottom: 6px;
    font: 600 10px/1 var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
  }

  dd {
    margin: 0;
    font: 400 13px/1.3 var(--font-mono);
  }
`;

export const Facts = styled('dl')`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--gap);
  margin: 0;
`;

// tabs: filled segments, the open one inverse
export const TabStrip = styled('div')`
  display: flex;
  align-items: stretch;
  gap: var(--gap);
  overflow-x: auto;

  > button:last-child {
    margin-left: auto;
  }
`;

export const Tab = styled('div')`
  display: flex;
  align-items: stretch;
  gap: var(--gap);
  flex: 0 0 auto;
  max-width: 160px;
  cursor: pointer;
`;

export const TabName = styled('span')`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: var(--layer-2);
  color: var(--fg);
  font: 500 12px/1 var(--font-sans);

  [data-active='false']:hover > & {
    background: var(--layer-2-hover);
  }

  [data-active='true'] > & {
    background: var(--inverse);
    color: var(--on-inverse);
  }
`;

export const TabNameInput = styled('input')`
  width: 100px;
  padding: 8px 12px;
  border: 0;
  border-radius: 0;
  background: var(--layer-2);
  color: var(--fg);
  font: 500 12px/1 var(--font-sans);
`;

// small square action beside a tab (delete, add)
export const TabAction = styled('button')`
  padding: 8px 10px;
  border: 0;
  border-radius: 0;
  background: var(--layer-2);
  color: var(--fg);
  font: 500 12px/1 var(--font-mono);
  cursor: pointer;

  &:hover:not(:disabled) {
    background: var(--layer-2-hover);
  }

  [data-active='true'] > & {
    background: var(--inverse);
    color: var(--on-inverse);
    opacity: 0.75;
  }

  [data-active='true'] > &:hover:not(:disabled) {
    background: var(--inverse-hover);
    opacity: 1;
  }
`;

// asks before a tab and its passwords are deleted
export const ConfirmBanner = styled('div')`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  background: var(--hot);
  color: var(--on-hot);

  div {
    display: flex;
    gap: var(--gap);
  }

  button {
    flex: 1 1 0;
    max-width: 140px;
    padding: 10px 12px;
    border: 0;
    border-radius: 0;
    background: var(--hot-deep);
    color: var(--on-hot);
    font: 500 12px/1 var(--font-sans);
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    filter: brightness(1.08);
  }
`;

// inline message above the list: errors, offline, sign-in prompt
export const Banner = styled('div')`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: var(--layer);
  color: var(--fg);

  &[data-kind='error'] {
    background: var(--hot);
    color: var(--on-hot);
    font-weight: 600;
  }

  &[data-kind='error'] button {
    background: var(--hot-deep);
    color: var(--on-hot);
  }
`;

export const List = styled('ul')`
  display: grid;
  gap: var(--gap);
  margin: 0;
  padding: 0;
  list-style: none;
`;

const flash = keyframes`
  from {
    background: color-mix(in srgb, var(--accent) 30%, transparent);
  }
`;

export const PasswordItem = styled('li')`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  height: 78px;
  padding: 8px 12px;
  background: var(--layer);
  min-width: 0;

  &:hover {
    position: relative;
    z-index: 5;
    background: var(--layer-hover);
  }

  &[data-flagged='true'] {
    background: var(--flag);
  }

  &[data-new='true'] {
    animation: ${flash} 900ms ease-out;
  }

  &[data-flagged='true']:hover {
    filter: brightness(0.95);
  }
`;

export const PasswordLine = styled('div')`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

// a long password is cut off, never wrapped
export const PasswordText = styled('p')`
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 600 13px/1.35 var(--font-mono);
  letter-spacing: -0.01em;

  &[data-hidden='true'] {
    letter-spacing: 0.14em;
  }
`;

export const ButtonRow = styled('span')`
  display: flex;
  flex-shrink: 0;
  gap: var(--gap);
`;

export const NoteCell = styled('input')`
  width: 100%;
  padding: 6px 10px;
  border: 0;
  border-radius: 0;
  background: var(--layer-2);
  color: var(--fg);
  font: 400 12px/1.2 var(--font-sans);

  &::placeholder {
    color: var(--muted);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
`;

export const Hint = styled('p')`
  margin: 0;
  font: 400 12px/1.4 var(--font-mono);
  color: var(--muted);
`;

// one row of square icon buttons, standing in for the row's content
export const ActionRow = styled('div')`
  display: flex;
  justify-content: flex-end;
  gap: var(--gap);
`;

export const ActionButton = styled('button')`
  position: relative;
  display: grid;
  place-items: center;
  --size: 54px;
  --pad: 16px;
  flex: 0 0 var(--size);
  width: var(--size);
  height: var(--size);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: var(--layer-2);
  color: var(--fg);
  cursor: pointer;

  &:hover {
    background: var(--layer-2-hover);
  }

  &[data-kind='back'] {
    background: var(--inverse);
    color: var(--on-inverse);
  }

  &[data-kind='back']:hover {
    background: var(--inverse-hover);
  }

  &[data-kind='danger'] {
    background: var(--hot);
    color: var(--on-hot);
  }

  &[data-kind='danger']:hover {
    background: var(--hot-hover);
  }

  svg {
    width: calc(var(--size) - 2 * var(--pad));
    height: calc(var(--size) - 2 * var(--pad));
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: square;
    stroke-linejoin: miter;
    pointer-events: none;
  }

  /* tooltip: a flat label under the button, shown on hover and keyboard focus */
  &::after {
    content: attr(data-tip);
    display: none;
    position: absolute;
    top: calc(100% + 7px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    padding: 6px 9px;
    background: var(--inverse);
    color: var(--on-inverse);
    font: 500 11px/1 var(--font-sans);
    white-space: nowrap;
    pointer-events: none;
  }

  &::before {
    content: '';
    display: none;
    position: absolute;
    top: calc(100% + 2px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    width: 10px;
    height: 5px;
    background: var(--inverse);
    clip-path: polygon(50% 0, 0 100%, 100% 100%);
    pointer-events: none;
  }

  &:hover::after,
  &:hover::before,
  &:focus-visible::after,
  &:focus-visible::before {
    display: block;
  }

  &:first-child::after {
    left: 0;
    transform: none;
  }

  &:last-child::after {
    left: auto;
    right: 0;
    transform: none;
  }
`;
