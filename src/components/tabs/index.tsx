import React, { useState } from 'react';
import { ITab } from '@types';
import {
  TabStrip,
  Tab,
  TabName,
  TabNameInput,
  TabAction,
  ConfirmBanner
} from '@components/styles/index.ts';

interface IProps {
  tabs: ITab[];
  activeTabId: string;
  // passwords in the open tab, once loaded
  passwordCount?: number;
  // set while deleting (one request per password)
  deletingId?: string;
  selectTab: (id: string) => void;
  addTab: () => void;
  deleteTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
}

function Tabs(props: IProps) {
  const { tabs, activeTabId, passwordCount, deletingId, selectTab, addTab, deleteTab, renameTab } =
    props;
  const [editingId, setEditingId] = useState<string | false>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | false>(false);

  const commitRename = (id: string, name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      renameTab(id, trimmed);
    }
    setEditingId(false);
  };

  const confirmTab = tabs.find((tab) => tab.slug === confirmDeleteId);

  return (
    <>
      <TabStrip>
        {tabs.map((tab) => (
          <Tab
            key={tab.slug}
            data-active={tab.slug === activeTabId}
            onClick={() => {
              selectTab(tab.slug);
              setConfirmDeleteId(false);
            }}
            onDoubleClick={() => setEditingId(tab.slug)}
          >
            {editingId === tab.slug ? (
              <TabNameInput
                autoFocus
                defaultValue={tab.name}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                  commitRename(tab.slug, e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    commitRename(tab.slug, e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    setEditingId(false);
                  }
                }}
              />
            ) : (
              <TabName title="double click to rename">{tab.name}</TabName>
            )}
            {/* asks in a banner below (confirm() freezes the panel); the last tab can't be deleted */}
            {tab.slug === activeTabId && tabs.length > 1 && editingId !== tab.slug && (
              <TabAction
                disabled={deletingId === tab.slug}
                title={deletingId === tab.slug ? 'deleting…' : 'delete tab'}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  setConfirmDeleteId(tab.slug);
                }}
              >
                {deletingId === tab.slug ? '…' : '✕'}
              </TabAction>
            )}
          </Tab>
        ))}
        <TabAction
          title="new tab"
          onClick={() => {
            addTab();
            setConfirmDeleteId(false);
          }}
        >
          +
        </TabAction>
      </TabStrip>
      {confirmTab && tabs.length > 1 && (
        <ConfirmBanner role="alertdialog" aria-label="Confirm delete tab">
          <span>
            <strong>Delete “{confirmTab.name}”?</strong> This permanently removes{' '}
            {passwordCount === undefined
              ? 'its passwords'
              : `${passwordCount} ${passwordCount === 1 ? 'password' : 'passwords'}`}{' '}
            from OpenBao.
          </span>
          <div>
            <button type="button" onClick={() => setConfirmDeleteId(false)}>
              Cancel
            </button>
            <button
              type="button"
              disabled={deletingId === confirmTab.slug}
              onClick={() => {
                deleteTab(confirmTab.slug);
                setConfirmDeleteId(false);
              }}
            >
              Delete tab
            </button>
          </div>
        </ConfirmBanner>
      )}
    </>
  );
}

export default Tabs;
