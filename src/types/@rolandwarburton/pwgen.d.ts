declare module '@rolandwarburton/pwgen' {
  import { ISettings } from '@/types';
  export function genpw(settings: ISettings): Promise<string>;
}
