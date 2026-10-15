import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { IPassword } from '../../types/index.ts';
import {
  ActionButton,
  ActionRow,
  Button,
  ButtonRow,
  Hint,
  NoteCell,
  PasswordItem,
  PasswordLine,
  PasswordText,
  Input
} from '../styles/index.ts';
import { IconBack } from '@components/icons/back.tsx';
import { IconCopy } from '@components/icons/copy.tsx';
import { IconEdit } from '@components/icons/edit.tsx';
import { IconEllipsis } from '@components/icons/ellipsis.tsx';
import { IconEye } from '@components/icons/eye.tsx';
import { IconFlag } from '@components/icons/flag.tsx';
import { IconQR } from '@components/icons/qr.tsx';
import { IconTrash } from '@components/icons/trash.tsx';

// ms of typing pause before a note is saved
const NOTE_SAVE_DELAY = 600;
// ms the Copy button reads "Copied"
const COPIED_DELAY = 1000;

interface IProps {
  password: IPassword;
  deletePassword: (key: string) => void;
  flagPassword: (key: string) => void;
  hidePassword: (key: string) => void;
  updateNote: (key: string, note: string) => void;
  savePassword: (key: string, value: string) => void;
  // fresh read; null when deleted elsewhere
  recheck: (key: string) => Promise<IPassword | null>;
  isNew?: boolean;
}

function Password(props: IProps) {
  const navigate = useNavigate();
  const { password, updateNote, deletePassword, flagPassword, hidePassword, savePassword, recheck, isNew } = props;
  // the row's actions replace its content while the menu is open
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(password.note);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // take a refreshed note unless the user is typing
  useEffect(() => {
    if (noteTimer.current === undefined) {
      setNote(password.note);
    }
  }, [password.note]);

  useEffect(
    () => () => {
      clearTimeout(noteTimer.current);
      clearTimeout(copiedTimer.current);
    },
    []
  );

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

  const copy = () => {
    setMenuOpen(false);
    withCurrent((current) => {
      navigator.clipboard
        .writeText(current.password)
        .then(() => {
          setCopied(true);
          clearTimeout(copiedTimer.current);
          copiedTimer.current = setTimeout(() => setCopied(false), COPIED_DELAY);
        })
        .catch((error) => {
          console.error('Unable to copy to clipboard:', error);
        });
    });
  };

  // revealing re-checks first; hiding doesn't need to
  const toggleHidden = () => {
    if (password.hidden) {
      withCurrent((current) => hidePassword(current.key));
    } else {
      hidePassword(password.key);
    }
  };

  const edit = () => {
    setMenuOpen(false);
    withCurrent(() => setEditing(true));
  };

  const closeMenuOnLeave = () => setMenuOpen(false);

  return (
    <PasswordItem data-flagged={password.flagged} data-new={isNew} onMouseLeave={closeMenuOnLeave}>
      {menuOpen && !editing ? (
        <ActionRow role="menu" aria-label="Row actions">
          <ActionButton data-kind="back" data-tip="Back" aria-label="Back" onClick={() => setMenuOpen(false)}>
            <IconBack />
          </ActionButton>
          <ActionButton data-tip="Copy" aria-label="Copy password" onClick={copy}>
            <IconCopy />
          </ActionButton>
          <ActionButton
            data-tip={password.hidden ? 'Show' : 'Hide'}
            aria-label={password.hidden ? 'Show password' : 'Hide password'}
            onClick={toggleHidden}
          >
            <IconEye hidden={password.hidden} />
          </ActionButton>
          <ActionButton
            data-tip="QR code"
            aria-label="Show QR code"
            onClick={() => {
              setMenuOpen(false);
              withCurrent((current) => {
                navigate(`/qr?${new URLSearchParams({ password: current.password })}`);
              });
            }}
          >
            <IconQR />
          </ActionButton>
          <ActionButton
            data-tip={password.flagged ? 'Unflag' : 'Flag'}
            aria-label={password.flagged ? 'Unflag password' : 'Flag password'}
            onClick={() => {
              flagPassword(password.key);
              setMenuOpen(false);
            }}
          >
            <IconFlag flagged={password.flagged} />
          </ActionButton>
          <ActionButton data-tip="Edit" aria-label="Edit password" onClick={edit}>
            <IconEdit />
          </ActionButton>
          <ActionButton
            data-kind="danger"
            data-tip="Delete"
            aria-label="Delete password"
            onClick={() => deletePassword(password.key)}
          >
            <IconTrash />
          </ActionButton>
        </ActionRow>
      ) : editing ? (
        <>
          <Input
            data-mono="true"
            autoFocus
            type={password.hidden ? 'password' : 'text'}
            defaultValue={password.password}
            aria-label="Edit password"
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()}
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
          <Hint>Enter saves a new version · Esc cancels</Hint>
        </>
      ) : (
        <>
          <PasswordLine>
            <PasswordText
              data-hidden={password.hidden}
              title="Double click to edit"
              onDoubleClick={edit}
            >
              {password.hidden ? '•'.repeat(password.password.length) : password.password}
            </PasswordText>
            <ButtonRow>
              <Button data-size="small" onClick={copy}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button data-size="small" onClick={toggleHidden}>
                {password.hidden ? 'Show' : 'Hide'}
              </Button>
              <Button data-size="small" aria-haspopup="menu" aria-label="More" onClick={() => setMenuOpen(true)}>
                <IconEllipsis />
              </Button>
              <Button
                data-size="small"
                data-kind="danger"
                aria-label="Delete"
                onClick={() => deletePassword(password.key)}
              >
                ✕
              </Button>
            </ButtonRow>
          </PasswordLine>
          <NoteCell
            type={password.hidden ? 'password' : 'text'}
            placeholder="note"
            aria-label="Note"
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
        </>
      )}
    </PasswordItem>
  );
}

export default Password;
