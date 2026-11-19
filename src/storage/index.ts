import { ISettings } from '@types';
import { BAO_ADDR } from '@/config.gen.ts';

// browser storage holds only settings, the selected tab and the search's All tabs box
const defaultSettings: ISettings = {
  minLength: 3,
  maxLength: 5,
  numberOfWords: 2,
  count: 1,
  delimiter: '-',
  prepend: '',
  append: '-secret',
  baoAddress: BAO_ADDR,
  baoMount: 'kv',
  baoBasePath: 'pwgen',
  baoRole: 'pwgen'
};

function getSettings(): Promise<ISettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', (result) => {
      // defaults fill fields added since the settings were saved; the address is always the build's
      resolve({
        ...defaultSettings,
        ...(result.settings as ISettings | undefined),
        baoAddress: defaultSettings.baoAddress
      });
    });
  });
}

function saveSettings(settings: ISettings) {
  chrome.storage.local.set({ settings });
}

// resolves to a slug in `slugs`, falling back to the first one
function getActiveTabId(slugs: string[]): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('activeTabId', (result) => {
      const id = result.activeTabId as string | undefined;
      if (id && slugs.includes(id)) {
        resolve(id);
      } else {
        resolve(slugs[0]);
      }
    });
  });
}

function saveActiveTabId(activeTabId: string) {
  chrome.storage.local.set({ activeTabId });
}

// the search's All tabs box
function getSearchAllTabs(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get('searchAllTabs', (result) => {
      resolve(result.searchAllTabs === true);
    });
  });
}

function saveSearchAllTabs(searchAllTabs: boolean) {
  chrome.storage.local.set({ searchAllTabs });
}

export {
  defaultSettings,
  getActiveTabId,
  getSearchAllTabs,
  getSettings,
  saveActiveTabId,
  saveSearchAllTabs,
  saveSettings
};
