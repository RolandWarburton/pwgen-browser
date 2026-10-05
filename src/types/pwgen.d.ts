// @rolandwarburton/pwgen ships no types; its imports point here with @ts-types
import type { ISettings } from './index.ts';
export function genpw(settings: ISettings): Promise<string>;
