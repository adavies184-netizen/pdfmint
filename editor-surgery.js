// PDF Breeze editor: precise removal of original text on pages PDFium cannot rewrite.
//
// Some PDFs (for example those printed from Chrome with web fonts) use Type 3 fonts, gradient patterns
// or shadings that PDFium cannot write back out. On those pages the editor never asks PDFium to rewrite
// the original content. It covers the old text with an exact picture of what is underneath and adds the
// new text on top, and it records which original text-drawing instructions the cover hides
// (a /PBCover marked-content block whose /PBDel entry lists "ordinal:x:y" for each one).
//
// When the PDF is saved, this module deletes exactly those instructions from the page's own content
// stream, leaving every other byte of it untouched, and removes the cover again. If anything about a page
// does not line up exactly, that page is left as it is (the cover still hides the old text).

const WHITE = new Set([0, 9, 10, 12, 13, 32]);
const DELIM = new Set([40, 41, 60, 62, 91, 93, 123, 125, 47, 37]);
const SHOW = new Set(['Tj', 'TJ', "'", '"']);

function tokenize(bytes) {
  const tokens = [];
  const n = bytes.length;
  let i = 0;
  let afterBI = false;
  while (i < n) {
    const c = bytes[i];
    if (WHITE.has(c)) { i++; continue; }
    if (c === 37) { while (i < n && bytes[i] !== 10 && bytes[i] !== 13) i++; continue; }
    const start = i;
    if (c === 40) { // literal string
      let depth = 0;
      for (; i < n; i++) {
        const b = bytes[i];
        if (b === 92) { i++; continue; }
        if (b === 40) depth++;
        else if (b === 41) { depth--; if (depth === 0) { i++; break; } }
      }
      tokens.push({ type: 'string', start, end: i });
      continue;
    }
    if (c === 60 && bytes[i + 1] === 60) { tokens.push({ type: 'dictOpen', start, end: i + 2 }); i += 2; continue; }
    if (c === 62 && bytes[i + 1] === 62) { tokens.push({ type: 'dictClose', start, end: i + 2 }); i += 2; continue; }
    if (c === 60) { while (i < n && bytes[i] !== 62) i++; i++; tokens.push({ type: 'hex', start, end: i }); continue; }
    if (c === 91 || c === 93 || c === 123 || c === 125) { tokens.push({ type: c === 91 ? 'arrOpen' : c === 93 ? 'arrClose' : 'brace', start, end: i + 1 }); i++; continue; }
    if (c === 47) { i++; while (i < n && !WHITE.has(bytes[i]) && !DELIM.has(bytes[i])) i++; tokens.push({ type: 'name', start, end: i }); continue; }
    while (i < n && !WHITE.has(bytes[i]) && !DELIM.has(bytes[i])) i++;
    if (i === start) { i++; continue; }
    let text = '';
    for (let k = start; k < i; k++) text += String.fromCharCode(bytes[k]);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text)) { tokens.push({ type: 'number', start, end: i, value: parseFloat(text) }); continue; }
    if (text === 'true' || text === 'false' || text === 'null') { tokens.push({ type: 'keyword', start, end: i }); continue; }
    tokens.push({ type: 'op', start, end: i, value: text });
    if (text === 'BI') afterBI = true;
    if (text === 'ID' && afterBI) {
      // Inline image data: skip the binary bytes up to "EI" between white space.
      afterBI = false;
      i++;
      while (i < n) {
        if (bytes[i] === 69 && bytes[i + 1] === 73 && WHITE.has(bytes[i - 1]) && (i + 2 >= n || WHITE.has(bytes[i + 2]))) break;
        i++;
      }
    }
  }
  return tokens;
}

const mul = (m, k) => [
  m[0] * k[0] + m[1] * k[2], m[0] * k[1] + m[1] * k[3],
  m[2] * k[0] + m[3] * k[2], m[2] * k[1] + m[3] * k[3],
  m[4] * k[0] + m[5] * k[2] + k[4], m[4] * k[1] + m[5] * k[3] + k[5],
];
const ID = [1, 0, 0, 1, 0, 0];

function literalText(bytes, token) {
  let out = '';
  for (let k = token.start + 1; k < token.end - 1; k++) {
    const b = bytes[k];
    if (b === 92) { k++; out += String.fromCharCode(bytes[k]); continue; }
    out += String.fromCharCode(b);
  }
  return out;
}

// Walk all content streams of a page in order, as one content sequence.
function analyse(streamBytes) {
  const shows = [];
  const images = [];
  const covers = [];
  let inlineStart = null;
  let ctm = ID, stack = [], tm = ID, tlm = ID, tl = 0, known = false, inText = false, bt = 0;
  const open = [];
  streamBytes.forEach((bytes, si) => {
    const tokens = tokenize(bytes);
    let operands = [];
    for (const token of tokens) {
      if (token.type !== 'op') { operands.push(token); continue; }
      const op = token.value;
      const nums = operands.filter(t => t.type === 'number').map(t => t.value);
      const start = operands.length ? operands[0].start : token.start;
      switch (op) {
        case 'q': stack.push(ctm); break;
        case 'Q': ctm = stack.pop() || ID; break;
        case 'cm': if (nums.length === 6) ctm = mul(nums, ctm); break;
        case 'BT': tm = tlm = ID; inText = true; known = true; bt++; break;
        case 'ET': inText = false; break;
        case 'Tm': if (nums.length === 6) { tm = tlm = nums; known = true; } break;
        case 'Td': if (nums.length === 2) { tlm = mul([1, 0, 0, 1, nums[0], nums[1]], tlm); tm = tlm; known = true; } break;
        case 'TD': if (nums.length === 2) { tl = -nums[1]; tlm = mul([1, 0, 0, 1, nums[0], nums[1]], tlm); tm = tlm; known = true; } break;
        case 'TL': if (nums.length === 1) tl = nums[0]; break;
        case 'T*': tlm = mul([1, 0, 0, 1, 0, -tl], tlm); tm = tlm; known = true; break;
        case 'BDC': case 'BMC': {
          const isCover = operands[0] && operands[0].type === 'name' && String.fromCharCode(...bytes.slice(operands[0].start, operands[0].end)) === '/PBCover';
          let del = null;
          if (isCover && op === 'BDC') {
            for (let k = 1; k < operands.length - 1; k++) {
              const t = operands[k];
              if (t.type === 'name' && String.fromCharCode(...bytes.slice(t.start, t.end)) === '/PBDel' && operands[k + 1].type === 'string') del = literalText(bytes, operands[k + 1]);
            }
          }
          open.push({ si, start, cover: isCover, del });
          break;
        }
        case 'EMC': {
          const block = open.pop();
          if (block && block.cover) {
            if (block.si === si) covers.push({ si, start: block.start, end: token.end, del: block.del });
            else covers.push({ broken: true, del: block.del });
          }
          break;
        }
        case 'BI': inlineStart = { si, start: token.start }; break;
        case 'EI': if (inlineStart && inlineStart.si === si) images.push({ si, start: inlineStart.start, end: token.end, box: unitBox(ctm) }); inlineStart = null; break;
        case 'Do': images.push({ si, start, end: token.end, box: unitBox(ctm) }); break;
        default:
          if (SHOW.has(op)) {
            if (op === "'" || op === '"') { tlm = mul([1, 0, 0, 1, 0, -tl], tlm); tm = tlm; known = true; }
            const origin = mul(tm, ctm);
            shows.push({ si, start, end: token.end, op, operands, known, x: origin[4], y: origin[5], bt });
            known = false;
          }
      }
      operands = [];
    }
  });
  return { shows, images, covers };
}

function unitBox(m) {
  const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return { left: Math.min(...xs), bottom: Math.min(...ys), right: Math.max(...xs), top: Math.max(...ys) };
}

// Entries: "k:x:y" = text instruction number k, drawn from (x, y);
// "x:k:left:bottom:right:top" = image (or form) instruction number k with those bounds.
function parseDel(text) {
  const texts = [], images = [];
  for (const part of (text || '').split(';')) {
    const bits = part.split(':');
    if (bits[0] === 'x') {
      const [k, left, bottom, right, top] = bits.slice(1).map(Number);
      if (Number.isInteger(k) && k >= 0) images.push({ k, left, bottom, right, top });
    } else {
      const [k, x, y] = bits.map(Number);
      if (Number.isInteger(k) && k >= 0) texts.push({ k, x, y });
    }
  }
  return { texts, images };
}

// Can these instructions be removed exactly? (Every target must be where the editor saw it.)
export function checkTargets(analysis, texts, images) {
  const { shows } = analysis;
  const textTargets = new Map(texts.map(t => [t.k, t]));
  let checked = 0;
  for (const [k, t] of textTargets) {
    const show = shows[k];
    if (!show) return false;
    if (show.known) {
      if (Math.abs(show.x - t.x) > 0.25 || Math.abs(show.y - t.y) > 0.25) return false;
      checked++;
    }
  }
  if (textTargets.size && !checked) return false;
  for (const k of textTargets.keys()) {
    const next = shows[k + 1];
    if (next && !textTargets.has(k + 1) && next.bt === shows[k].bt && !next.known) return false;
  }
  for (const t of images) {
    const image = analysis.images[t.k];
    if (!image) return false;
    const b = image.box;
    if (Math.abs(b.left - t.left) > 0.6 || Math.abs(b.bottom - t.bottom) > 0.6 || Math.abs(b.right - t.right) > 0.6 || Math.abs(b.top - t.top) > 0.6) return false;
  }
  return true;
}

export function analyseStreams(streamBytes) { return analyse(streamBytes); }

function concat(parts) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
const ascii = text => Uint8Array.from(text, ch => ch.charCodeAt(0));

function rebuild(bytes, edits) {
  edits.sort((a, b) => a.start - b.start);
  const parts = [];
  let at = 0;
  for (const edit of edits) {
    if (edit.start < at) continue;
    parts.push(bytes.slice(at, edit.start));
    if (edit.insert) parts.push(ascii(edit.insert));
    at = edit.end;
  }
  parts.push(bytes.slice(at));
  return concat(parts);
}

// Returns a plan of byte edits for one page, or null if the page must be left as it is.
export function planPage(streamBytes) {
  const analysis = analyse(streamBytes);
  const { shows, covers } = analysis;
  if (!covers.length) return null;
  if (covers.some(c => c.broken)) return null;
  const targets = new Map(), imageTargets = new Map();
  for (const cover of covers) { const del = parseDel(cover.del); for (const t of del.texts) targets.set(t.k, t); for (const t of del.images) imageTargets.set(t.k, t); }
  if (!targets.size && !imageTargets.size) return null;
  // A kept text instruction right after a deleted one must not depend on where the deleted text ended (checked inside).
  if (!checkTargets(analysis, [...targets.values()], [...imageTargets.values()])) return null;
  const edits = streamBytes.map(() => []);
  for (const k of imageTargets.keys()) { const image = analysis.images[k]; edits[image.si].push({ start: image.start, end: image.end, insert: ' ' }); }
  for (const k of targets.keys()) {
    const show = shows[k];
    let insert = '';
    if (show.op === "'") insert = ' T* ';
    if (show.op === '"') {
      const nums = show.operands.filter(t => t.type === 'number').map(t => t.value);
      insert = nums.length >= 2 ? ` ${nums[0]} Tw ${nums[1]} Tc T* ` : ' T* ';
    }
    edits[show.si].push({ start: show.start, end: show.end, insert: insert || ' ' });
  }
  for (const cover of covers) edits[cover.si].push({ start: cover.start, end: cover.end, insert: ' ' });
  return edits;
}

export function applyPlan(streamBytes, plan) {
  return streamBytes.map((bytes, i) => (plan[i].length ? rebuild(bytes, plan[i]) : null));
}

// bytes: Uint8Array of a whole PDF. lib: the pdf-lib module. Returns new bytes, or the same bytes if nothing changed.
export async function applyPendingDeletions(bytes, lib) {
  const { PDFDocument, PDFName, PDFArray, PDFRawStream, decodePDFRawStream } = lib;
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true });
  let changed = 0;
  for (const page of pdf.getPages()) {
    const node = page.node;
    const contents = node.lookup(PDFName.of('Contents'));
    if (!contents) continue;
    const refs = contents instanceof PDFArray ? contents.asArray() : [node.get(PDFName.of('Contents'))];
    const streams = refs.map(ref => pdf.context.lookup(ref));
    if (!streams.every(s => s instanceof PDFRawStream)) continue;
    let decoded;
    try { decoded = streams.map(s => decodePDFRawStream(s).decode()); } catch (_) { continue; }
    if (!decoded.some(b => indexOf(b, '/PBCover') >= 0)) continue;
    const plan = planPage(decoded);
    if (!plan) continue;
    const rebuilt = applyPlan(decoded, plan);
    const newRefs = refs.map((ref, i) => (rebuilt[i] ? pdf.context.register(pdf.context.flateStream(rebuilt[i])) : ref));
    node.set(PDFName.of('Contents'), pdf.context.obj(newRefs));
    changed++;
  }
  if (!changed) return bytes;
  return pdf.save({ useObjectStreams: false, updateFieldAppearances: false });
}

function indexOf(bytes, text) {
  const pattern = ascii(text);
  outer: for (let i = 0; i <= bytes.length - pattern.length; i++) {
    for (let k = 0; k < pattern.length; k++) if (bytes[i + k] !== pattern[k]) continue outer;
    return i;
  }
  return -1;
}

export { analyse, tokenize };
