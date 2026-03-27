// VIA keyboard troubleshooting utilities
// These are not used by the UI — import them manually for debugging.

import {
  CMD, MACRO_TERMINATOR,
  hidCommand, shiftTo16Bit,
  getMacroCount, getMacroBufferSize, getMacroBytes,
  writeMacroBytesAt, parseMacros,
} from './via';

// Minimal write test: writes "a" to M0, reads back, verifies.
export async function testMacroWrite(): Promise<string> {
  const macroCount = await getMacroCount();
  if (macroCount === 0) return 'No macro slots available';

  // Read current M0 so we can restore it
  const buffer = await getMacroBytes();
  const macros = parseMacros(buffer, macroCount);
  const originalM0 = [...macros[0]];

  // Write a single ASCII "a" (0x61) + terminator to offset 0
  const testData = [0x61, MACRO_TERMINATOR];
  await writeMacroBytesAt(0, testData);

  // Read back
  const verifyBuffer = await getMacroBytes();
  const verifyMacros = parseMacros(verifyBuffer, macroCount);
  const readBack = verifyMacros[0];

  const match = readBack.length === 1 && readBack[0] === 0x61;

  // Restore original M0
  const restoreData = [...originalM0, MACRO_TERMINATOR];
  await writeMacroBytesAt(0, restoreData);

  if (match) {
    return 'Write test PASSED: wrote "a" to M0, read back matched, restored original.';
  } else {
    return `Write test FAILED: expected [97], got [${readBack.join(', ')}]`;
  }
}

// Read-only diagnostic: returns keyboard macro info without writing anything.
export async function diagnoseMacros(): Promise<string> {
  const versionRes = await hidCommand(CMD.GET_PROTOCOL_VERSION);
  const protocolVersion = shiftTo16Bit(versionRes[1], versionRes[2]);

  const macroCount = await getMacroCount();
  const bufferSize = await getMacroBufferSize();

  const lines = [
    `Protocol version: ${protocolVersion}`,
    `Macro count: ${macroCount}`,
    `Buffer size: ${bufferSize} bytes`,
  ];

  if (macroCount > 0 && bufferSize > 0) {
    const buffer = await getMacroBytes();
    const macros = parseMacros(buffer, macroCount);
    lines.push(`Buffer first 32 bytes: [${buffer.slice(0, 32).join(', ')}]`);
    for (let i = 0; i < macroCount; i++) {
      const m = macros[i];
      const preview = m.length > 0
        ? m.map(b => b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : `\\x${b.toString(16).padStart(2, '0')}`).join('')
        : '(empty)';
      lines.push(`  M${i}: ${m.length} bytes — ${preview}`);
    }
  }

  return lines.join('\n');
}
