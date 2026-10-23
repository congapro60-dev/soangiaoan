import * as XLSX from 'xlsx';

type CfbApi = {
  read: (input: Uint8Array, options: { type: 'array' }) => unknown;
  find: (container: unknown, name: string) => { content?: Uint8Array } | null;
};

export function decodeMathTypeEquation(bytes: Uint8Array): string {
  const CFB = (XLSX as unknown as { CFB?: CfbApi; default?: { CFB?: CfbApi } }).default?.CFB
    ?? (XLSX as unknown as { CFB?: CfbApi }).CFB;
  if (!CFB) throw new Error('MathType CFB parser unavailable');
  let native: Uint8Array;
  try {
    const container = CFB.read(bytes, { type: 'array' });
    const stream = CFB.find(container, 'Equation Native');
    if (!stream?.content) throw new Error('missing Equation Native stream');
    native = new Uint8Array(stream.content);
  } catch (error) {
    throw new Error(`MathType malformed CFB: ${String(error)}`);
  }
  let pos = 0;
  const fail = (reason: string): never => { throw new Error(`MathType ${reason} at Equation Native byte ${pos}`); };
  const byte = (): number => {
    if (pos >= native.length) fail('malformed/truncated record');
    return native[pos++];
  };
  const word = () => byte() | (byte() << 8);
  const zeroString = () => { while (byte() !== 0) { /* terminated metadata */ } };
  if (native.length < 28) fail('malformed/truncated native header');
  const view = new DataView(native.buffer, native.byteOffset, native.byteLength);
  if (view.getUint32(0, true) !== 28) fail('unsupported native header');
  if (view.getUint32(8, true) !== native.length - 28) fail('malformed/truncated native length');
  pos = 28;
  if (byte() !== 5) fail('unsupported MTEF version');
  byte(); byte(); byte(); byte();
  zeroString();
  if (byte() > 1) fail('malformed inline flag');

  const dimensions = () => {
    const count = byte();
    let ended = 0;
    let unit = true;
    while (ended < count) {
      const packed = byte();
      for (const nibble of [packed >> 4, packed & 15]) {
        if (ended === count) {
          if (nibble !== 0) fail('malformed dimension padding');
        } else if (unit) {
          if (nibble > 4) fail('malformed dimension unit');
          unit = false;
        } else if (nibble === 15) {
          ended++;
          unit = true;
        } else if (nibble > 11) fail('malformed dimension digit');
      }
    }
  };
  const symbols: Record<number, string> = {
    0x2192: '\\to ', 0x2212: '-', 0x221e: '\\infty ',
    0x22c5: '\\cdot ', 0x2260: '\\ne ', 0x2265: '\\ge ',
    0x2200: '\\forall ', 0xef02: '\\,', 0x7b: '\\{', 0x7d: '\\}',
  };

  // ponytail: only sample v5 records/templates, depth <=64; extend with fixture-backed cases.
  const records = (depth: number): string[] => {
    if (depth > 64) fail('unsupported record depth');
    const parts: string[] = [];
    while (true) {
      const tag = byte();
      if (tag === 0) return parts;
      if (tag >= 10 && tag <= 14) continue; // Size switches do not change formula text.
      if (tag === 19) { zeroString(); continue; }
      if (tag === 17) { byte(); zeroString(); continue; }
      if (tag === 18) {
        if (byte() !== 0) fail('unsupported equation preferences options');
        dimensions(); dimensions();
        const styles = byte();
        for (let i = 0; i < styles; i++) if (byte() !== 0) byte();
        continue;
      }
      if (tag === 1) {
        const options = byte();
        if (options !== 0 && options !== 1) fail(`unsupported LINE options ${options}`);
        parts.push(options === 1 ? '' : records(depth + 1).join(''));
        continue;
      }
      if (tag === 2) {
        const options = byte();
        if ((options & ~6) !== 0) fail(`unsupported CHAR options ${options}`);
        const typeface = byte();
        if (![130, 131, 134, 136, 150, 152].includes(typeface)) fail(`unsupported typeface ${typeface}`);
        const code = word();
        if (options & 4) byte(); // Optional font position; MTCode remains authoritative.
        const character = String.fromCharCode(code);
        if (symbols[code] !== undefined) parts.push(symbols[code]);
        else if (/^[a-zA-Z0-9.+\-=()[\]]$/.test(character)) parts.push(character);
        else fail(`unsupported MTCode 0x${code.toString(16)}`);
        continue;
      }
      if (tag === 4) {
        const options = byte();
        const horizontal = byte();
        const vertical = byte();
        if (options !== 0 || horizontal !== 1 || vertical !== 1) fail('unsupported PILE alignment/options');
        parts.push(`\\begin{gathered}${records(depth + 1).join('\\\\')}\\end{gathered}`);
        continue;
      }
      if (tag !== 3) fail(`unsupported record ${tag}`);
      const options = byte();
      const selector = byte();
      let variation = byte();
      if (variation & 128) variation = (variation & 127) | (byte() << 8);
      const templateOptions = byte();
      if (options !== 0 || templateOptions !== 0) fail(`unsupported template ${selector} options`);
      const supported = (selector === 1 && variation === 3)
        || (selector === 2 && variation === 1)
        || (selector === 3 && variation === 3)
        || ([10, 11, 27, 28].includes(selector) && variation === 0)
        || (selector === 23 && variation === 16);
      if (!supported) fail(`unsupported template ${selector} variation ${variation}`);
      const slots = records(depth + 1);
      const arity = (count: number) => {
        if (slots.length !== count) fail(`malformed template ${selector} slot count ${slots.length}, expected ${count}`);
      };
      if (selector === 1 || selector === 2 || selector === 3) {
        arity(selector === 2 ? 2 : 3);
        const left = selector === 1 ? '(' : selector === 2 ? '\\{' : '[';
        const right = selector === 1 ? ')' : selector === 2 ? '.' : ']';
        if (slots[1] !== left || (selector !== 2 && slots[2] !== right)) fail('unsupported fence glyph');
        parts.push(`\\left${left}${slots[0]}\\right${right}`);
      } else if (selector === 10) {
        arity(2);
        if (slots[1] !== '') fail('malformed square root index');
        parts.push(`\\sqrt{${slots[0]}}`);
      } else if (selector === 11) {
        arity(2);
        if (!slots[0] || !slots[1]) fail('malformed empty fraction');
        parts.push(`\\frac{${slots[0]}}{${slots[1]}}`);
      } else if (selector === 23) {
        arity(3);
        if (slots[0] !== 'lim' || !slots[1] || slots[2] !== '') fail('unsupported limit slots');
        parts.push(`\\lim_{${slots[1]}}`);
      } else {
        arity(2);
        const index = selector === 27 ? 0 : 1;
        if (!parts.length || !slots[index] || slots[1 - index] !== '') fail('malformed script slots/base');
        parts[parts.length - 1] += `${selector === 27 ? '_' : '^'}{${slots[index]}}`;
      }
    }
  };
  const result = records(0).join('');
  if (pos !== native.length) fail('malformed trailing bytes');
  if (!result) fail('malformed empty equation');
  return result;
}
