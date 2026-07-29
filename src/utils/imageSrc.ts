/**
 * Turns whatever the backend stores for an image into something an <img src>
 * accepts: a URL, a data: URL, or raw base64 (as Categories.ImgBase64 holds).
 *
 * Raw base64 carries no MIME type, so the leading bytes are sniffed. Unknown
 * formats return null rather than a broken image — callers fall back to the
 * emoji icon.
 */

/** 32 base64 chars decode to 24 bytes — enough for every magic number below. */
const SNIFF_CHARS = 32;

function sniffMimeType(base64: string): string | null {
  const usable = Math.min(SNIFF_CHARS, base64.length - (base64.length % 4));
  if (usable < 8) return null;

  let binary: string;
  try {
    binary = atob(base64.slice(0, usable));
  } catch {
    return null; // not valid base64
  }

  const at = (start: number, length: number) => binary.slice(start, start + length);
  const byte = (index: number) => binary.charCodeAt(index);

  if (byte(0) === 0x89 && at(1, 3) === 'PNG') return 'image/png';
  if (byte(0) === 0xff && byte(1) === 0xd8) return 'image/jpeg';
  if (at(0, 3) === 'GIF') return 'image/gif';
  if (at(0, 2) === 'BM') return 'image/bmp';
  if (at(0, 4) === 'RIFF' && at(8, 4) === 'WEBP') return 'image/webp';

  // ISO base media files (AVIF / HEIC) start with a size field then "ftyp".
  if (at(4, 4) === 'ftyp') {
    const brand = at(8, 4);
    if (brand.startsWith('hei') || brand.startsWith('hev')) return 'image/heic';
    return 'image/avif';
  }

  if (/^\s*(<\?xml|<svg)/i.test(binary)) return 'image/svg+xml';

  return null;
}

export function toImageSrc(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^data:/i.test(trimmed)) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;

  // Base64 columns often come back with line breaks in them.
  const base64 = trimmed.replace(/\s+/g, '');
  const mimeType = sniffMimeType(base64);
  return mimeType ? `data:${mimeType};base64,${base64}` : null;
}
