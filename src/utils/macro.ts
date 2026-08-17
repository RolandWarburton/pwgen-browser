// VIA macro expression parsing and byte encoding.
// The expression grammar matches the VIA app's macro editor so templates can be
// copy-pasted between the two — see the-via/app src/utils/macro-api/.
//
//   literal text   typed as-is; a literal { must be escaped as \{
//   {KC_TAB}       tap        01 01 <keycode>
//   {+KC_LSFT}     key down   01 02 <keycode>
//   {-KC_LSFT}     key up     01 03 <keycode>
//   {KC_LCTL,KC_C} chord      all downs, then ups in reverse order
//   {500}          delay ms   01 04 <ascii digits> 7C
//
// The additions on top of VIA's grammar are $p and $n, replaced at write time
// with the password and the note. A literal $ is escaped as \$.

const KEY_ACTION_PREFIX = 1;
const KEY_ACTION_TAP = 1;
const KEY_ACTION_DOWN = 2;
const KEY_ACTION_UP = 3;
const KEY_ACTION_DELAY = 4;
const DELAY_TERMINATOR = 0x7C; // '|'

// Bytes outside this range are not literal text: 0 terminates a macro and 1
// starts an escape sequence, and anything >= 0x80 is not valid send_string input.
const MIN_PRINTABLE = 0x20;
const MAX_PRINTABLE = 0x7E;

const MAX_DELAY_MS = 65535;

// Basic HID keycodes. Deliberately limited to keys that can appear in a login
// macro — VIA's own table is generated per-keyboard and includes layer/quantum
// keycodes that mean nothing when replayed from a macro buffer.
function buildKeycodes(): Record<string, number> {
  const codes: Record<string, number> = {
    KC_ENTER: 0x28, KC_ESCAPE: 0x29, KC_BSPACE: 0x2A, KC_TAB: 0x2B, KC_SPACE: 0x2C,
    KC_MINUS: 0x2D, KC_EQUAL: 0x2E, KC_LBRACKET: 0x2F, KC_RBRACKET: 0x30,
    KC_BSLASH: 0x31, KC_SCOLON: 0x33, KC_QUOTE: 0x34, KC_GRAVE: 0x35,
    KC_COMMA: 0x36, KC_DOT: 0x37, KC_SLASH: 0x38, KC_CAPSLOCK: 0x39,
    KC_INSERT: 0x49, KC_HOME: 0x4A, KC_PGUP: 0x4B, KC_DELETE: 0x4C,
    KC_END: 0x4D, KC_PGDOWN: 0x4E, KC_RIGHT: 0x4F, KC_LEFT: 0x50,
    KC_DOWN: 0x51, KC_UP: 0x52,
    KC_LCTRL: 0xE0, KC_LSHIFT: 0xE1, KC_LALT: 0xE2, KC_LGUI: 0xE3,
    KC_RCTRL: 0xE4, KC_RSHIFT: 0xE5, KC_RALT: 0xE6, KC_RGUI: 0xE7,
  };

  for (let i = 0; i < 26; i++) {
    codes[`KC_${String.fromCharCode(65 + i)}`] = 0x04 + i;
  }
  for (let i = 1; i <= 9; i++) {
    codes[`KC_${i}`] = 0x1D + i;
  }
  codes.KC_0 = 0x27;
  for (let i = 1; i <= 12; i++) {
    codes[`KC_F${i}`] = 0x39 + i;
  }

  // VIA accepts both the long and short spellings of these.
  const aliases: Record<string, string> = {
    KC_ENT: 'KC_ENTER', KC_ESC: 'KC_ESCAPE', KC_BSPC: 'KC_BSPACE',
    KC_SPC: 'KC_SPACE', KC_MINS: 'KC_MINUS', KC_EQL: 'KC_EQUAL',
    KC_LBRC: 'KC_LBRACKET', KC_RBRC: 'KC_RBRACKET', KC_BSLS: 'KC_BSLASH',
    KC_SCLN: 'KC_SCOLON', KC_QUOT: 'KC_QUOTE', KC_GRV: 'KC_GRAVE',
    KC_COMM: 'KC_COMMA', KC_SLSH: 'KC_SLASH', KC_CAPS: 'KC_CAPSLOCK',
    KC_INS: 'KC_INSERT', KC_DEL: 'KC_DELETE', KC_PGDN: 'KC_PGDOWN',
    KC_RGHT: 'KC_RIGHT', KC_LCTL: 'KC_LCTRL', KC_LSFT: 'KC_LSHIFT',
    KC_RCTL: 'KC_RCTRL', KC_RSFT: 'KC_RSHIFT',
  };
  for (const [alias, target] of Object.entries(aliases)) {
    codes[alias] = codes[target];
  }

  return codes;
}

const KEYCODES = buildKeycodes();

// Matches any unescaped $ and the character after it, so that unknown tokens
// can be rejected rather than silently typed. \$p is a literal and won't match.
const SUBSTITUTION_RE = /(?<!\\)\$(.?)/gs;

export interface IMacroValues {
  password: string;
  note: string;
}

const TOKEN_FIELDS: Record<string, keyof IMacroValues> = { p: 'password', n: 'note' };

// True if the template actually substitutes the given field, ignoring escapes.
export function macroUses(template: string, field: keyof IMacroValues): boolean {
  return [...template.matchAll(SUBSTITUTION_RE)].some((m) => TOKEN_FIELDS[m[1]] === field);
}

// A macro can only carry printable ASCII as literal text; anything else would
// write a control byte or a keycode the keyboard can't type.
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

function lookupKeycode(name: string): number {
  const keycode = KEYCODES[name];
  if (keycode === undefined) {
    throw new Error(`Unknown keycode in macro: ${name}`);
  }
  return keycode;
}

function encodeKeyBlock(block: string): number[] {
  if (!block.length) {
    throw new Error("Empty {} in macro. Add a keycode, or write \\{} to type a literal brace");
  }

  if (/^\d+$/.test(block)) {
    const delay = parseInt(block, 10);
    if (delay < 1 || delay > MAX_DELAY_MS) {
      throw new Error(`Macro delay must be between 1 and ${MAX_DELAY_MS} ms, got ${delay}`);
    }
    return [
      KEY_ACTION_PREFIX, KEY_ACTION_DELAY,
      ...encodeText(String(delay), 'Delay'), DELAY_TERMINATOR
    ];
  }

  const action = /^[+-]/.test(block) ? block.slice(0, 1) : null;
  const names = block
    .replace(/^[+-]/, '')
    .split(',')
    .map((name) => name.trim().toUpperCase())
    .filter((name) => name.length);

  if (!names.length) {
    throw new Error(`No keycode given in macro block: {${block}}`);
  }

  if (action) {
    if (names.length > 1) {
      throw new Error(`{${action}...} takes a single keycode, got ${names.length}`);
    }
    const verb = action === '+' ? KEY_ACTION_DOWN : KEY_ACTION_UP;
    return [KEY_ACTION_PREFIX, verb, lookupKeycode(names[0])];
  }

  if (names.length === 1) {
    return [KEY_ACTION_PREFIX, KEY_ACTION_TAP, lookupKeycode(names[0])];
  }

  // Chord: press every key in order, then release in reverse.
  const keycodes = names.map(lookupKeycode);
  return [
    ...keycodes.flatMap((kc) => [KEY_ACTION_PREFIX, KEY_ACTION_DOWN, kc]),
    ...[...keycodes].reverse().flatMap((kc) => [KEY_ACTION_PREFIX, KEY_ACTION_UP, kc]),
  ];
}

// Literal text, with \{ and \$ unescaped. Substituted values are encoded here
// rather than spliced into the raw template, so a note or password containing
// { or $ is typed literally instead of being re-parsed as macro syntax.
function encodeLiteral(text: string, values: IMacroValues): number[] {
  const bytes: number[] = [];
  const unescape = (part: string) => encodeText(part.replace(/\\([{$])/g, '$1'), 'Macro');
  let consumed = 0;

  for (const match of text.matchAll(SUBSTITUTION_RE)) {
    const field = TOKEN_FIELDS[match[1]];
    if (!field) {
      throw new Error(
        `Unknown macro token: $${match[1]}. Use $p (password), $n (note), or \\$ for a literal $`
      );
    }
    bytes.push(...unescape(text.slice(consumed, match.index)));
    bytes.push(...encodeText(values[field], field === 'password' ? 'Password' : 'Note'));
    consumed = match.index + match[0].length;
  }
  bytes.push(...unescape(text.slice(consumed)));

  return bytes;
}

export function encodeMacro(template: string, values: IMacroValues): number[] {
  if (/(?<!\\){[^}]*$/.test(template)) {
    throw new Error("Unclosed { in macro. Are you missing a '}'?");
  }

  const bytes: number[] = [];

  for (const chunk of template.split(/(?<!\\)({.*?})/g)) {
    if (!chunk.length) continue;
    if (/^{.*}$/.test(chunk)) {
      bytes.push(...encodeKeyBlock(chunk.slice(1, -1).trim()));
    } else {
      bytes.push(...encodeLiteral(chunk, values));
    }
  }

  return bytes;
}
