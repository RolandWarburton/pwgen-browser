import { ITab, IPassword, ISettings } from '@types';

const defaultSettings: ISettings = {
  minLength: 3,
  maxLength: 5,
  numberOfWords: 2,
  count: 1,
  delimiter: '-',
  prepend: '',
  append: '-secret',
  passwordsListMaxLength: 5,
  retainLastPassword: true,
  storePasswordHistory: true
};

function createTab(name: string, passwords: IPassword[] = []): ITab {
  return { id: crypto.randomUUID(), name, passwords };
}

function getSettings(): Promise<ISettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', (result) => {
      if (result.settings) {
        resolve(result.settings as ISettings);
      } else {
        resolve(defaultSettings);
      }
    });
  });
}

function saveSettings(settings: ISettings) {
  chrome.storage.local.set({ settings });
}

function getTabs(): Promise<ITab[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('tabs', (result) => {
      const tabs = result.tabs as ITab[] | undefined;
      if (tabs && tabs.length > 0) {
        resolve(tabs);
      } else {
        resolve([createTab('Passwords')]);
      }
    });
  });
}

function saveTabs(tabs: ITab[]) {
  chrome.storage.local.set({ tabs });
}

// resolves to a tab id that exists in `tabs`, falling back to the first tab
function getActiveTabId(tabs: ITab[]): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('activeTabId', (result) => {
      const id = result.activeTabId as string | undefined;
      if (id && tabs.some((tab) => tab.id === id)) {
        resolve(id);
      } else {
        resolve(tabs[0].id);
      }
    });
  });
}

function saveActiveTabId(activeTabId: string) {
  chrome.storage.local.set({ activeTabId });
}

function getPasswordHistory(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('passwordHistory', (result) => {
      if (typeof result.passwordHistory == 'string') {
        resolve(JSON.parse(result.passwordHistory) as string[]);
      } else {
        resolve([]);
      }
    });
  });
}

function savePasswordHistory(passwordHistory: string[]) {
  chrome.storage.local.set({ passwordHistory: JSON.stringify(passwordHistory) });
}

function clearPasswordHistory() {
  chrome.storage.local.remove('passwordHistory');
}

export {
  defaultSettings,
  createTab,
  getSettings,
  saveSettings,
  getTabs,
  saveTabs,
  getActiveTabId,
  saveActiveTabId,
  getPasswordHistory,
  savePasswordHistory,
  clearPasswordHistory
};
