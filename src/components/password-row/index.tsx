import React, { useState } from 'react';
import { IPassword } from '../../types';
import { NoteCell, Row, SVGHover, DropdownWrapper, DropdownMenu } from '../styles';
import { IconCopy } from '@components/icons/copy';
import { IconQR } from '@components/icons/qr';
import { IconFlag } from '@components/icons/flag';
import { IconTrash } from '@components/icons/trash';
import { IconEllipsis } from '@components/icons/ellipsis';
import { useNavigate } from 'react-router';
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
  const {
    passwords, index, updateNote, deletePassword, flagPassword, hidePassword
  } = props;
  const password = passwords[index];
  const [menuOpen, setMenuOpen] = useState(false);
  const handleMouseLeave = () => {
    setMenuOpen(false);
  };

  return (
    <Row
      key={index}
      columns="1fr auto 2fr auto auto auto "
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
      <NoteCell
        type={password.hidden ? 'password' : 'text'}
        placeholder="note"
        value={password.note}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNote(e, index)}
      />
      <SVGHover onClick={() => hidePassword(index)}>
        <IconEye open={password.hidden} />
      </SVGHover>
      <DropdownWrapper onMouseLeave={handleMouseLeave}>
        <SVGHover onClick={() => setMenuOpen(!menuOpen)}>
          <IconEllipsis />
        </SVGHover>
        {menuOpen && (
          <DropdownMenu>
            <SVGHover
              onClick={() => {
                navigate(`/qr?${new URLSearchParams({ password: password.password })}`);
                setMenuOpen(false);
              }}
            >
              <IconQR />
            </SVGHover>
            <SVGHover
              onClick={() => {
                flagPassword(index);
                setMenuOpen(false);
              }}
            >
              <IconFlag />
            </SVGHover>
          </DropdownMenu>
        )}
      </DropdownWrapper>
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
