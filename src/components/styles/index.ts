import { styled } from 'goober';

export const Form = styled('form')``;
export const FormLabel = styled('div')``;
export const FormInput = styled('input')``;

export const Container = styled('div')`
  margin: 10px 0px;
`;

export const Row = styled('div')`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
  align-items: center;
  margin: 0.25em;
`;

export const PasswordCell = styled('div')`
  grid-column: 1 / 2;
`;

export const NoteCell = styled('input')`
  grid-column: 2 / 3;
`;

export const SettingsButton = styled('div')`
  position: fixed;
  bottom: 10px;
  right: 10px;
`;

export const SaveButton = styled('div')`
  position: fixed;
  bottom: 10px;
  left: 10px;
`;

const baseButton = `
  background-color: #333;
  color: #fff;
  font-size: 1.25em;
  padding: 6px 8px;
  transition: background-color 0.3s ease;
  border: 0px;

  &:hover {
    background-color: #555;
  }

  &:active {
    opacity: 0.8;
  }
`;

export const ButtonGroupButton = styled('button')`
  ${baseButton}
`;

export const ButtonGroup = styled('div')`
  button:first-child {
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
  }

  button:last-child {
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
  }
`;

export const Button = styled('button')`
  ${baseButton}
  border-radius: 5px;
`;
