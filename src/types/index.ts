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
}

export { ISettings, IPassword };
