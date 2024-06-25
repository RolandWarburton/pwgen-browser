import React from 'react';
import { IPassword } from '../../types';
import { NoteCell, Row, SVGHover } from '../styles';
import { IconCopy } from '@components/icons/copy';
import { IconQR } from '@components/icons/qr';
import { IconFlag } from '@components/icons/flag';
import { IconTrash } from '@components/icons/trash';
import { useNavigate } from 'react-router-dom';
import { IconEye } from '@components/icons/eye';

interface IProps {
  passwords: IPassword[];
  index: number;
  deletePassword: (index: number) => void;
  flagPassword: (index: number) => void;
  updateNote: (event: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  hidePassword: (index: number) => void;
}

function Password(props: IProps) {
  const navigate = useNavigate();
  const { passwords, index, updateNote, deletePassword, flagPassword, hidePassword } = props;
  const password = passwords[index];

  return (
    <Row
      key={index}
      columns="1fr auto auto auto 2fr auto auto"
      background={password.flagged ? 'yellow' : ''}
    >
      {password.hidden ? '*'.repeat(password.password.length) : password.password}
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
      <SVGHover
        onClick={() => {
          flagPassword(index);
        }}
      >
        <IconFlag />
      </SVGHover>
      <NoteCell
        type={password.hidden ? 'password' : 'text'}
        placeholder="note"
        value={password.note}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNote(e, index)}
      />
      <SVGHover onClick={() => hidePassword(index)}>
        <IconEye open={password.hidden} />
      </SVGHover>
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
