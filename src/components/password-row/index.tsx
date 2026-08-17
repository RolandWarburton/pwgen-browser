import React, { useState } from 'react';
import { IPassword } from '../../types';
import { NoteCell, MacroCell, Row, SVGHover, DropdownWrapper, DropdownMenu } from '../styles';
import { IconCopy } from '@components/icons/copy';
import { IconQR } from '@components/icons/qr';
import { IconFlag } from '@components/icons/flag';
import { IconTrash } from '@components/icons/trash';
import { IconKeyboard } from '@components/icons/keyboard';
import { IconEllipsis } from '@components/icons/ellipsis';
import { useNavigate } from 'react-router-dom';
import { IconEye } from '@components/icons/eye';
import { IconBraces } from '@components/icons/braces';
import { pushCredentialsToKeyboard } from '../../utils/via';
import { getSettings } from '@/storage';

interface IProps {
  passwords: IPassword[];
  index: number;
  deletePassword: (index: number) => void;
  flagPassword: (index: number) => void;
  updateNote: (event: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  updateMacro: (event: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  hidePassword: (index: number) => void;
}

function Password(props: IProps) {
  const navigate = useNavigate();
  const {
    passwords, index, updateNote, updateMacro, deletePassword, flagPassword, hidePassword
  } = props;
  const password = passwords[index];
  const [pushing, setPushing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMacro, setShowMacro] = useState(false);
  const handleMouseLeave = () => {
    setMenuOpen(false);
  };

  const handlePushToKeyboard = async () => {
    setPushing(true);
    try {
      const { macroSlot } = await getSettings();
      await pushCredentialsToKeyboard(
        password.note, password.password, password.macro, macroSlot
      );
      alert(`Pushed to keyboard macro M${macroSlot}`);
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
      {showMacro ? (
        // The macro holds $p, not the password itself, so it isn't masked.
        <MacroCell
          type="text"
          placeholder="$n{KC_TAB}$p{KC_ENTER}"
          value={password.macro ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateMacro(e, index)}
        />
      ) : (
        <NoteCell
          type={password.hidden ? 'password' : 'text'}
          placeholder="note"
          value={password.note}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateNote(e, index)}
        />
      )}
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
                setShowMacro(!showMacro);
                setMenuOpen(false);
              }}
              title={showMacro ? 'Show note' : 'Show keyboard macro'}
            >
              <IconBraces active={showMacro} />
            </SVGHover>
            <SVGHover
              onClick={() => {
                handlePushToKeyboard();
                setMenuOpen(false);
              }}
              title="Write this row's macro to the keyboard macro slot"
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
