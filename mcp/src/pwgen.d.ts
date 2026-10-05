declare module '@rolandwarburton/pwgen' {
  export interface GenpwOptions {
    minLength?: number;
    maxLength?: number;
    numberOfWords?: number;
    count?: number;
    delimiter?: string;
    prepend?: string;
    append?: string;
  }
  export function genpw(options?: GenpwOptions): Promise<string>;
}
