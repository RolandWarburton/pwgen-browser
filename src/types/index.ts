interface ISettings {
  minLength: number;
  maxLength: number;
  numberOfWords: number;
  count: number;
  delimiter: string;
  prepend: string;
  append: string;
  passwordsListMaxLength: number;
  retainLastPassword: boolean;
  storePasswordHistory: boolean;
}

interface IPassword {
  password: string;
  note: string;
  flagged: boolean;
  hidden: boolean;
  // VIA macro expression pushed to the keyboard, with $p standing in for the
  // password. Absent or empty means "note, Enter, password".
  macro?: string;
}

interface ITab {
  id: string;
  name: string;
  passwords: IPassword[];
}

export { ISettings, IPassword, ITab };
