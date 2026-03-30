import React, { useState } from 'react';
import { IPassword } from '../../types';
import { NoteCell, Row, SVGHover, DropdownWrapper, DropdownMenu } from '../styles';
import { IconCopy } from '@components/icons/copy';
import { IconQR } from '@components/icons/qr';
import { IconFlag } from '@components/icons/flag';
import { IconTrash } from '@components/icons/trash';
import { IconKeyboard } from '@components/icons/keyboard';
import { IconEllipsis } from '@components/icons/ellipsis';
import { useNavigate } from 'react-router-dom';
import { IconEye } from '@components/icons/eye';
import { pushCredentialsToKeyboard } from '../../utils/via';

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
  const [pushing, setPushing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const handleMouseLeave = () => {
    setMenuOpen(false);
  };

  const handlePushToKeyboard = async () => {
    setPushing(true);
    try {
      await pushCredentialsToKeyboard(password.note, password.password);
      alert('Pushed to keyboard macro M10');
    } catch (err) {
      alert(`Failed: ${(err as Error).message}`);
    } finally {
      setPushing(false);
    }
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
                navigate(`/qr/${password.password}`);
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
            <SVGHover
              onClick={() => {
                handlePushToKeyboard();
                setMenuOpen(false);
              }}
              title="Push username + password to keyboard macro M10"
              style={{ opacity: pushing ? 0.5 : 1 }}
            >
              <IconKeyboard />
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
