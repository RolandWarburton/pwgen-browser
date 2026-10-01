import React, { useState } from 'react';
import { ITab } from '@types';
import { TabStrip, Tab, TabName, TabNameInput, TabAction } from '@components/styles';

interface IProps {
  tabs: ITab[];
  activeTabId: string;
  selectTab: (id: string) => void;
  addTab: () => void;
  deleteTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;
}

function Tabs(props: IProps) {
  const { tabs, activeTabId, selectTab, addTab, deleteTab, renameTab } = props;
  // the tab currently being renamed, and the tab whose delete is awaiting confirmation
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
          key={tab.id}
          data-active={tab.id === activeTabId}
          onClick={() => {
            selectTab(tab.id);
            setConfirmDeleteId(false);
          }}
          onDoubleClick={() => setEditingId(tab.id)}
        >
          {editingId === tab.id ? (
            <TabNameInput
              autoFocus
              defaultValue={tab.name}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                commitRename(tab.id, e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') {
                  commitRename(tab.id, e.currentTarget.value);
                } else if (e.key === 'Escape') {
                  setEditingId(false);
                }
              }}
            />
          ) : (
            <TabName title="double click to rename">{tab.name}</TabName>
          )}
          {/* deleting takes two clicks, because a confirm() dialog would freeze the panel.
              the last tab cannot be deleted, so there is always somewhere to put passwords */}
          {tab.id === activeTabId && tabs.length > 1 && editingId !== tab.id && (
            <TabAction
              data-confirm={confirmDeleteId === tab.id}
              title={confirmDeleteId === tab.id ? 'click again to delete' : 'delete tab'}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (confirmDeleteId === tab.id) {
                  deleteTab(tab.id);
                  setConfirmDeleteId(false);
                } else {
                  setConfirmDeleteId(tab.id);
                }
              }}
            >
              ✕
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
