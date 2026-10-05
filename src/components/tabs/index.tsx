import React, { useState } from 'react';
import { ITab } from '@types';
import { TabStrip, Tab, TabName, TabNameInput, TabAction } from '@components/styles';

interface IProps {
  tabs: ITab[];
  activeTabId: string;
  // set while deleting (one request per password)
  deletingId?: string;
  selectTab: (id: string) => void;
  addTab: () => void;
  deleteTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
}

function Tabs(props: IProps) {
  const { tabs, activeTabId, deletingId, selectTab, addTab, deleteTab, renameTab } = props;
  const [editingId, setEditingId] = useState<string | false>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | false>(false);

  const commitRename = (id: string, name: string) => {
    const trimmed = name.trim();
    if (trimmed) {
      renameTab(id, trimmed);
    }
    setEditingId(false);
  };

  return (
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
          {/* two clicks (confirm() freezes the panel); the last tab can't be deleted */}
          {tab.slug === activeTabId && tabs.length > 1 && editingId !== tab.slug && (
            <TabAction
              data-confirm={confirmDeleteId === tab.slug}
              disabled={deletingId === tab.slug}
              title={
                deletingId === tab.slug
                  ? 'deleting…'
                  : confirmDeleteId === tab.slug
                    ? 'click again to permanently delete this tab and its passwords'
                    : 'delete tab'
              }
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (confirmDeleteId === tab.slug) {
                  deleteTab(tab.slug);
                  setConfirmDeleteId(false);
                } else {
                  setConfirmDeleteId(tab.slug);
                }
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
  );
}

export default Tabs;
