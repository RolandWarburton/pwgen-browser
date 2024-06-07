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

type IPasswords = { password: string; note: string }[];

export { ISettings, IPasswords };
