import React, { useEffect, useRef, useState } from 'react';
import { IPassword, ITab } from '@types';
import {
  Input,
  PasswordCells,
  ResultCell,
  ResultItem,
  ResultLine,
  RowButton,
  SearchBar,
  SearchField,
  SearchScope,
  TabChip
} from '@components/styles/index.ts';
import { IconCopy } from '@components/icons/copy.tsx';
import { IconSearch } from '@components/icons/search.tsx';

// ms the Copy button reads "Copied"
const COPIED_DELAY = 1000;

// `query` is trimmed and lower case. A hidden password matches on its note only.
function matches(item: IPassword, query: string): boolean {
  return (
    item.note.toLowerCase().includes(query) ||
    (!item.hidden && item.password.toLowerCase().includes(query))
  );
}

interface ISearchBoxProps {
  query: string;
  allTabs: boolean;
  setQuery: (query: string) => void;
  setAllTabs: (allTabs: boolean) => void;
}

function SearchBox(props: ISearchBoxProps) {
  const { query, allTabs, setQuery, setAllTabs } = props;
  const input = useRef<HTMLInputElement>(null);

  return (
    <SearchBar role='search'>
      <SearchField>
        <IconSearch />
        <Input
          ref={input}
          id='search'
          type='search'
          placeholder='Search passwords and notes'
          aria-label='Search passwords and notes'
          autoComplete='off'
          spellCheck={false}
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Escape') {
              setQuery('');
            }
          }}
        />
        {query !== '' && (
          <button
            type='button'
            aria-label='Clear search'
            onClick={() => {
              setQuery('');
              input.current?.focus();
            }}
          >
            ✕
          </button>
        )}
      </SearchField>
      <SearchScope>
        <input
          id='search-all-tabs'
          type='checkbox'
          checked={allTabs}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllTabs(e.target.checked)}
        />
        All tabs
      </SearchScope>
    </SearchBar>
  );
}

// the text with the first match of `query` marked
function Highlight(props: { text: string; query: string }) {
  const { text, query } = props;
  const at = query ? text.toLowerCase().indexOf(query) : -1;
  if (at < 0) {
    return <>{text}</>;
  }
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}

interface ISearchResultProps {
  tab: ITab;
  password: IPassword;
  query: string;
  // fresh read; null when deleted elsewhere
  recheck: (slug: string, key: string) => Promise<IPassword | null>;
  openTab: (slug: string, key: string) => void;
}

// read-only: edit, flag, hide or delete it in its tab
function SearchResult(props: ISearchResultProps) {
  const { tab, password, query, recheck, openTab } = props;
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const copy = async () => {
    const current = await recheck(tab.slug, password.key);
    if (!current) {
      return;
    }
    try {
      await navigator.clipboard.writeText(current.password);
      setCopied(true);
      clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_DELAY);
    } catch (error) {
      console.error('Unable to copy to clipboard:', error);
    }
  };

  const dots = (text: string) => '•'.repeat(text.length);

  return (
    <ResultItem data-flagged={password.flagged}>
      <PasswordCells>
        <ResultCell data-kind='password' data-hidden={password.hidden}>
          {password.hidden ? dots(password.password) : <Highlight text={password.password} query={query} />}
        </ResultCell>
        <ResultLine>
          <TabChip
            type='button'
            title={`Open in ${tab.name}`}
            onClick={() => openTab(tab.slug, password.key)}
          >
            {tab.name} →
          </TabChip>
          <ResultCell data-hidden={password.hidden && password.note !== ''}>
            {password.hidden ? dots(password.note) : <Highlight text={password.note} query={query} />}
          </ResultCell>
        </ResultLine>
      </PasswordCells>
      <RowButton
        type='button'
        data-tip={copied ? 'Copied' : 'Copy'}
        data-copied={copied}
        aria-label='Copy password'
        onClick={copy}
      >
        <IconCopy />
      </RowButton>
    </ResultItem>
  );
}

export { matches, SearchBox, SearchResult };
