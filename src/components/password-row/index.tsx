import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { IPassword } from '../../types/index.ts';
import {
  ActionButton,
  ActionRow,
  NoteCell,
  PasswordCells,
  PasswordFields,
  PasswordItem,
  PasswordText,
  RowButton,
  RowButtons
} from '../styles/index.ts';
import { IconBack } from '@components/icons/back.tsx';
import { IconClose } from '@components/icons/close.tsx';
import { IconCopy } from '@components/icons/copy.tsx';
import { IconEdit } from '@components/icons/edit.tsx';
import { IconEllipsis } from '@components/icons/ellipsis.tsx';
import { IconEye } from '@components/icons/eye.tsx';
import { IconFlag } from '@components/icons/flag.tsx';
import { IconQR } from '@components/icons/qr.tsx';
import { IconTrash } from '@components/icons/trash.tsx';

// Both cells are always-live inputs: click to edit, leaving the cell saves, Enter leaves it,
// Esc puts the saved value back. A password is written once, on leaving (each write is a new
// KV version); a note is saved as you type.

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
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(password.note);
  const [draft, setDraft] = useState(password.password);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const passwordInput = useRef<HTMLInputElement>(null);
  const passwordFocused = useRef(false);
  // Esc: leave the cell without saving
  const cancelling = useRef(false);
  // the menu's Edit: focus the password cell once the menu has closed
  const focusPassword = useRef(false);

  // take a refreshed note unless the user is typing
  useEffect(() => {
    if (noteTimer.current === undefined) {
      setNote(password.note);
    }
  }, [password.note]);

  // take a refreshed password unless the user is editing it
  useEffect(() => {
    if (!passwordFocused.current) {
      setDraft(password.password);
    }
  }, [password.password]);

  useEffect(() => {
    if (!menuOpen && focusPassword.current) {
      focusPassword.current = false;
      passwordInput.current?.focus();
      passwordInput.current?.select();
    }
  }, [menuOpen]);

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
    focusPassword.current = true;
    setMenuOpen(false);
  };

  // start from the current OpenBao value, unless the user has already started typing
  const startPasswordEdit = () => {
    passwordFocused.current = true;
    const shown = draft;
    recheck(password.key).then((current) => {
      if (current) {
        setDraft((value) => (value === shown ? current.password : value));
      }
    });
  };

  const finishPasswordEdit = () => {
    passwordFocused.current = false;
    if (cancelling.current) {
      cancelling.current = false;
      setDraft(password.password);
    } else if (draft === '') {
      setDraft(password.password);
    } else {
      // skips an unchanged value
      savePassword(password.key, draft);
    }
  };

  const leaveOnEnterOrEsc = (e: React.KeyboardEvent<HTMLInputElement>, cancel: () => void) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      cancel();
      e.currentTarget.blur();
    }
  };

  const closeMenuOnLeave = () => setMenuOpen(false);

  return (
    <PasswordItem data-flagged={password.flagged} data-new={isNew} onMouseLeave={closeMenuOnLeave}>
      {menuOpen ? (
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
      ) : (
        <PasswordFields>
          <PasswordCells>
            <PasswordText
              ref={passwordInput}
              type={password.hidden ? 'password' : 'text'}
              data-hidden={password.hidden}
              aria-label="Password"
              spellCheck={false}
              autoComplete="off"
              value={draft}
              onFocus={startPasswordEdit}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
              onBlur={finishPasswordEdit}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                leaveOnEnterOrEsc(e, () => {
                  cancelling.current = true;
                })}
            />
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
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                leaveOnEnterOrEsc(e, () => {
                  // back to the saved note; a pause in typing may already have saved part of it
                  clearTimeout(noteTimer.current);
                  noteTimer.current = undefined;
                  setNote(password.note);
                })}
            />
          </PasswordCells>
          <RowButtons>
            <RowButton
              data-tip={copied ? 'Copied' : 'Copy'}
              data-copied={copied}
              aria-label="Copy password"
              onClick={copy}
            >
              <IconCopy />
            </RowButton>
            <RowButton
              data-tip={password.hidden ? 'Show' : 'Hide'}
              aria-label={password.hidden ? 'Show password' : 'Hide password'}
              onClick={toggleHidden}
            >
              <IconEye hidden={password.hidden} />
            </RowButton>
            <RowButton data-tip="More" aria-haspopup="menu" aria-label="More" onClick={() => setMenuOpen(true)}>
              <IconEllipsis />
            </RowButton>
            <RowButton
              data-kind="danger"
              data-tip="Delete"
              aria-label="Delete password"
              onClick={() => deletePassword(password.key)}
            >
              <IconClose />
            </RowButton>
          </RowButtons>
        </PasswordFields>
      )}
    </PasswordItem>
  );
}

export default Password;
