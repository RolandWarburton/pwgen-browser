import React from 'react';
import { IPassword } from '../../types';
import { NoteCell, Row, SVGHover } from '../styles';
import { IconCopy } from '../../pages/app/copy';
import { IconQR } from '../../pages/app/qr';
import { IconTrash } from '../../pages/app/trash';
import { useNavigate } from 'react-router-dom';

interface IProps {
  passwords: IPassword[];
  index: number;
  // password: IPassword;
  // setPasswords: React.Dispatch<React.SetStateAction<false | IPassword[]>>;
  deletePassword: (index: number) => void;
  updateNote: (event: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  // deletePassword: (index: number) => void;
  // updateNote: (event: React.ChangeEvent<HTMLInputElement>, index: number) => void;
}

function Password(props: IProps) {
  const navigate = useNavigate();
  const { passwords, index, updateNote, deletePassword } = props;
  const password = passwords[index];

  return (
    <Row key={index} columns="1fr auto auto 2fr auto">
      {password.password}
      <SVGHover
        onClick={() => {
          navigator.clipboard.writeText(password.password).catch((error) => {
            console.error('Unable to copy to clipboard:', error);
          });
        }}
      >
        <IconCopy />
      </SVGHover>
      <SVGHover
        onClick={() => {
          navigate(`/qr/${password.password}`);
        }}
      >
        <IconQR />
      </SVGHover>
      <NoteCell
        type="text"
        placeholder="note"
        value={password.note}
        onChange={(e) => updateNote(e, index)}
      />
      <SVGHover
        onClick={() => {
          deletePassword(index);
        }}
      >
        <IconTrash />
      </SVGHover>
    </Row>
  );
}

export default Password;
