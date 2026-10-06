interface ISettings {
  minLength: number;
  maxLength: number;
  numberOfWords: number;
  count: number;
  delimiter: string;
  prepend: string;
  append: string;
  baoAddress: string;
  baoMount: string;
  baoBasePath: string;
  baoRole: string;
}

// one KV secret: <base path>/<tab slug>/<key>
interface IPassword {
  key: string;
  password: string;
  note: string;
  flagged: boolean;
  hidden: boolean;
  createdTime: string;
  version: number;
  meta: Record<string, string>;
}

interface ITab {
  slug: string; // folder name, fixed
  name: string;
  order: number;
}

interface IBaoSession {
  token: string;
  expiresAt: number; // epoch ms
  ttl: number; // seconds
  displayName: string;
}

export type { ISettings, IPassword, ITab, IBaoSession };
