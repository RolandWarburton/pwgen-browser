// VIA keyboard communication and macro writing
// Reference: https://github.com/the-via/app

export const CMD = {
  GET_PROTOCOL_VERSION: 0x01,
  MACRO_GET_COUNT: 0x0C,
  MACRO_GET_BUFFER_SIZE: 0x0D,
  MACRO_GET_BUFFER: 0x0E,
  MACRO_SET_BUFFER: 0x0F,
} as const;

const KC_ENTER = 0x28;

// Macro byte encoding, as parsed by QMK's send_string_with_delay_impl():
// SS_QMK_PREFIX introduces a sequence, then a subcommand byte, then a keycode.
// A prefix followed by an unrecognised subcommand is silently swallowed.
const SS_QMK_PREFIX = 1;
const SS_TAP_CODE = 1;

export const MACRO_TERMINATOR = 0;
const MACRO_SLOT = 10;
const CHUNK_SIZE = 28;

// Bytes outside this range are not literal text: 0 terminates a macro and 1
// starts an escape sequence, and anything >= 0x80 is not valid send_string input.
const MIN_PRINTABLE = 0x20;
const MAX_PRINTABLE = 0x7E;

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

// A macro can only carry printable ASCII as literal text; anything else would
// silently write a control byte or a bogus keycode to the keyboard.
function encodeText(text: string, field: string): number[] {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.charCodeAt(0);
    if (char.length > 1 || code < MIN_PRINTABLE || code > MAX_PRINTABLE) {
      throw new Error(`${field} contains a character the keyboard can't type: "${char}"`);
    }
    bytes.push(code);
  }

  return bytes;
}

function encodeTap(keycode: number): number[] {
  return [SS_QMK_PREFIX, SS_TAP_CODE, keycode];
}

function encodeMacroBytes(username: string, password: string): number[] {
  return [
    ...encodeText(username, 'Note'),
    ...encodeTap(KC_ENTER),
    ...encodeText(password, 'Password'),
  ];
}


export async function pushCredentialsToKeyboard(username: string, password: string): Promise<void> {
  if (!username) throw new Error('Username (note field) is empty');
  if (!password) throw new Error('Password is empty');

  const macroCount = await getMacroCount();
  if (macroCount <= MACRO_SLOT) {
    throw new Error(`Keyboard only has ${macroCount} macro slots (need at least ${MACRO_SLOT + 1})`);
  }

  const bufferSize = await getMacroBufferSize();
  const buffer = await getMacroBytes();
  const macros = parseMacros(buffer, macroCount);

  // Build the new macro bytes
  const newMacroBytes = encodeMacroBytes(username, password);

  // Find the byte offset where M10 starts in the buffer
  let offset = 0;
  for (let i = 0; i < MACRO_SLOT; i++) {
    offset += macros[i].length + 1; // +1 for terminator
  }

  // Rebuild from M10 onwards: new M10 + remaining macros (M11, M12, ...)
  const patch: number[] = [...newMacroBytes, MACRO_TERMINATOR];
  for (let i = MACRO_SLOT + 1; i < macroCount; i++) {
    patch.push(...macros[i], MACRO_TERMINATOR);
  }

  if (offset + patch.length > bufferSize) {
    throw new Error('New macro is too large to fit in the buffer');
  }

  // Write only from M10's offset onwards
  await writeMacroBytesAt(offset, patch);
}
