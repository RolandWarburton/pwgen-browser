import React, { useEffect, useRef, useState } from 'react';
import { IPassword } from '../../types';
import { NoteCell, Row, SVGHover, DropdownWrapper, DropdownMenu } from '../styles';
import { IconCopy } from '@components/icons/copy';
import { IconQR } from '@components/icons/qr';
import { IconFlag } from '@components/icons/flag';
import { IconTrash } from '@components/icons/trash';
import { IconEllipsis } from '@components/icons/ellipsis';
import { useNavigate } from 'react-router';
import { IconEye } from '@components/icons/eye';
import { IconEdit } from '@components/icons/edit';

// ms of typing pause before a note is saved
const NOTE_SAVE_DELAY = 600;

interface IProps {
  password: IPassword;
  deletePassword: (key: string) => void;
  flagPassword: (key: string) => void;
  hidePassword: (key: string) => void;
  updateNote: (key: string, note: string) => void;
  savePassword: (key: string, value: string) => void;
  // fresh read; null when deleted elsewhere
  recheck: (key: string) => Promise<IPassword | null>;
}

function Password(props: IProps) {
  const navigate = useNavigate();
  const {
    password,
    updateNote,
    deletePassword,
    flagPassword,
    hidePassword,
    savePassword,
    recheck
  } = props;
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(password.note);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // take a refreshed note unless the user is typing
  useEffect(() => {
    if (noteTimer.current === undefined) {
      setNote(password.note);
    }
  }, [password.note]);

  useEffect(() => () => clearTimeout(noteTimer.current), []);

  const saveNote = (value: string) => {
    clearTimeout(noteTimer.current);
    noteTimer.current = undefined;
    if (value !== password.note) {
      updateNote(password.key, value);
    }
  };

  // act on the current OpenBao value, never a stale or deleted one
  const withCurrent = async (action: (current: IPassword) => void) => {
    const current = await recheck(password.key);
    if (current) {
      action(current);
    }
  };

  return (
    <Row columns="1fr auto 2fr auto auto auto " background={password.flagged ? 'yellow' : ''}>
      {editing ? (
        <input
          autoFocus
          type={password.hidden ? 'password' : 'text'}
          defaultValue={password.password}
          title="Enter saves a new version, Escape cancels"
          onBlur={() => setEditing(false)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              savePassword(password.key, e.currentTarget.value);
              setEditing(false);
            } else if (e.key === 'Escape') {
              setEditing(false);
            }
          }}
        />
      ) : password.hidden ? (
        '*'.repeat(password.password.length)
      ) : (
        password.password
      )}
      <SVGHover
        onClick={() =>
          withCurrent((current) => {
            navigator.clipboard.writeText(current.password).catch((error) => {
              console.error('Unable to copy to clipboard:', error);
            });
          })
        }
      >
        <IconCopy />
      </SVGHover>
      <NoteCell
        type={password.hidden ? 'password' : 'text'}
        placeholder="note"
        // custom_metadata limit
        maxLength={512}
        value={note}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;
          setNote(value);
          clearTimeout(noteTimer.current);
          noteTimer.current = setTimeout(() => saveNote(value), NOTE_SAVE_DELAY);
        }}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          if (noteTimer.current !== undefined) {
            saveNote(e.target.value);
          }
        }}
      />
      <SVGHover
        onClick={() => {
          // revealing re-checks first; hiding doesn't need to
          if (password.hidden) {
            withCurrent((current) => hidePassword(current.key));
          } else {
            hidePassword(password.key);
          }
        }}
      >
        <IconEye open={password.hidden} />
      </SVGHover>
      <DropdownWrapper onMouseLeave={() => setMenuOpen(false)}>
        <SVGHover onClick={() => setMenuOpen(!menuOpen)}>
          <IconEllipsis />
        </SVGHover>
        {menuOpen && (
          <DropdownMenu>
            <SVGHover
              onClick={() => {
                setMenuOpen(false);
                withCurrent((current) => {
                  navigate(`/qr?${new URLSearchParams({ password: current.password })}`);
                });
              }}
            >
              <IconQR />
            </SVGHover>
            <SVGHover
              onClick={() => {
                flagPassword(password.key);
                setMenuOpen(false);
              }}
            >
              <IconFlag />
            </SVGHover>
            <SVGHover
              title="edit (saves a new version)"
              onClick={() => {
                setMenuOpen(false);
                withCurrent(() => setEditing(true));
              }}
            >
              <IconEdit />
            </SVGHover>
          </DropdownMenu>
        )}
      </DropdownWrapper>
      <SVGHover
        onClick={() => {
          deletePassword(password.key);
        }}
      >
        <IconTrash />
      </SVGHover>
    </Row>
  );
}

export default Password;
