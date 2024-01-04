import { styled } from 'goober';

export const Container = styled('div')``;

export const PasswordRow = styled('div')`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px; // Adjust the gap as needed
  align-items: center;
`;

export const PasswordCell = styled('input')`
  grid-column: 1 / 2;
`;

export const NoteCell = styled('input')`
  grid-column: 2 / 3;
`;
