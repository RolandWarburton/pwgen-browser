// VIA keyboard communication and macro writing
// Reference: https://github.com/the-via/app

import { encodeMacro, macroUses } from './macro';

export const CMD = {
  GET_PROTOCOL_VERSION: 0x01,
  MACRO_GET_COUNT: 0x0C,
  MACRO_GET_BUFFER_SIZE: 0x0D,
  MACRO_GET_BUFFER: 0x0E,
  MACRO_SET_BUFFER: 0x0F,
} as const;

export const MACRO_TERMINATOR = 0;
export const DEFAULT_MACRO_SLOT = 10;
export const FALLBACK_MACRO_COUNT = 16;
const CHUNK_SIZE = 28;

const COMMAND_TIMEOUT_MS = 3000;

const VIA_USAGE_PAGE = 0xFF60;
const VIA_USAGE = 0x61;

let device: HIDDevice | null = null;

function shiftFrom16Bit(val: number): [number, number] {
  return [(val >> 8) & 0xFF, val & 0xFF];
}

export function shiftTo16Bit(hi: number, lo: number): number {
  return (hi << 8) | lo;
}

function filterVIADevices(devices: HIDDevice[]): HIDDevice[] {
  return devices.filter((d) =>
    d.collections?.some((c) => c.usage === VIA_USAGE && c.usagePage === VIA_USAGE_PAGE)
  );
}

// Opens the WebHID device picker to pair a VIA keyboard.
// Must be called from a page that won't close on focus loss (e.g. settings).
export async function pairDevice(): Promise<string> {
  const requested = await navigator.hid.requestDevice({
    filters: [{ usagePage: VIA_USAGE_PAGE, usage: VIA_USAGE }]
  });
  if (!requested.length) throw new Error('No device selected');
  const dev = requested[0];
  device = dev;
  if (!device.opened) await device.open();
  return dev.productName || 'Unknown keyboard';
}

// Returns true if a previously-paired VIA device is available.
export async function hasVIADevice(): Promise<boolean> {
  const devices = filterVIADevices(await navigator.hid.getDevices());
  return devices.length > 0;
}

async function getDevice(): Promise<HIDDevice> {
  if (device?.opened) return device;

  const devices = filterVIADevices(await navigator.hid.getDevices());
  if (devices.length > 0) {
    device = devices[0];
  } else {
    throw new Error('No paired VIA keyboard. Pair one in Settings first.');
  }

  if (!device.opened) await device.open();
  return device;
}

export async function hidCommand(commandId: number, args: number[] = []): Promise<number[]> {
  const dev = await getDevice();

  const data = new Uint8Array(32);
  data[0] = commandId;
  args.forEach((arg, i) => { data[i + 1] = arg; });

  const responsePromise = new Promise<number[]>((resolve, reject) => {
    const handler = (event: HIDInputReportEvent) => {
      clearTimeout(timer);
      dev.removeEventListener('inputreport', handler);
      resolve(Array.from(new Uint8Array(event.data.buffer)));
    };
    // Without this the promise never settles if the keyboard doesn't reply,
    // leaving the listener attached and the caller waiting forever.
    const timer = setTimeout(() => {
      dev.removeEventListener('inputreport', handler);
      reject(new Error(`Keyboard did not respond to command 0x${commandId.toString(16)}`));
    }, COMMAND_TIMEOUT_MS);
    dev.addEventListener('inputreport', handler);
  });

  await dev.sendReport(0, data);
  return responsePromise;
}

export async function getMacroCount(): Promise<number> {
  const res = await hidCommand(CMD.MACRO_GET_COUNT);
  return res[1];
}

export async function getMacroBufferSize(): Promise<number> {
  const res = await hidCommand(CMD.MACRO_GET_BUFFER_SIZE);
  return shiftTo16Bit(res[1], res[2]);
}

export async function getMacroBytes(): Promise<number[]> {
  const bufferSize = await getMacroBufferSize();
  const bytes: number[] = [];

  for (let offset = 0; offset < bufferSize; offset += CHUNK_SIZE) {
    const sz = Math.min(CHUNK_SIZE, bufferSize - offset);
    const res = await hidCommand(CMD.MACRO_GET_BUFFER, [
      ...shiftFrom16Bit(offset), sz
    ]);
    for (let i = 4; i < 4 + sz; i++) {
      bytes.push(res[i]);
    }
  }

  return bytes;
}

// Write macro bytes directly to the buffer at a given offset.
// No reset, no sentinel — just overwrites the specified region.
export async function writeMacroBytesAt(offset: number, data: number[]): Promise<void> {
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await hidCommand(CMD.MACRO_SET_BUFFER, [
      ...shiftFrom16Bit(offset + i), chunk.length, ...chunk
    ]);
  }
}

export function parseMacros(buffer: number[], count: number): number[][] {
  const macros: number[][] = [];
  let current: number[] = [];

  for (const byte of buffer) {
    if (byte === MACRO_TERMINATOR) {
      macros.push(current);
      current = [];
      if (macros.length >= count) break;
    } else {
      current.push(byte);
    }
  }

  while (macros.length < count) {
    macros.push([]);
  }

  return macros;
}

// Without a macro template, fall back to the original behaviour: type the note,
// tap Enter, type the password. Expressed as a template so there is one encoder.
const DEFAULT_TEMPLATE = '$n{KC_ENTER}$p';

export async function pushCredentialsToKeyboard(
  note: string,
  password: string,
  macro?: string,
  slot: number = DEFAULT_MACRO_SLOT
): Promise<void> {
  const template = macro?.trim() ? macro : DEFAULT_TEMPLATE;

  if (!note && macroUses(template, 'note')) throw new Error('Note is empty');
  if (!password && macroUses(template, 'password')) throw new Error('Password is empty');

  // Encode before touching the keyboard so a bad template fails without a write.
  const newMacroBytes = encodeMacro(template, { note, password });
  if (!newMacroBytes.length) throw new Error('Macro is empty');

  const macroCount = await getMacroCount();
  if (macroCount <= slot) {
    throw new Error(
      `Keyboard only has ${macroCount} macro slots, so M${slot} does not exist. ` +
      'Pick a lower slot in Settings.'
    );
  }

  const bufferSize = await getMacroBufferSize();
  const buffer = await getMacroBytes();
  const macros = parseMacros(buffer, macroCount);

  // Find the byte offset where the target macro starts in the buffer
  let offset = 0;
  for (let i = 0; i < slot; i++) {
    offset += macros[i].length + 1; // +1 for terminator
  }

  // Rebuild from the target slot onwards: new macro + the macros that follow it
  const patch: number[] = [...newMacroBytes, MACRO_TERMINATOR];
  for (let i = slot + 1; i < macroCount; i++) {
    patch.push(...macros[i], MACRO_TERMINATOR);
  }

  if (offset + patch.length > bufferSize) {
    throw new Error('New macro is too large to fit in the buffer');
  }

  // Write only from the target slot's offset onwards
  await writeMacroBytesAt(offset, patch);
}
