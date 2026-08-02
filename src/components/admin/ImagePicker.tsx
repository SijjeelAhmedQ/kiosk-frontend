import { useRef, useState, type ChangeEvent } from 'react';
import { cn } from '@/utils/cn';

/**
 * Picks an image and hands back a data: URL.
 *
 * The file is drawn onto a canvas and re-encoded before it leaves the browser.
 * A phone photo is three or four megabytes, which becomes a third larger again
 * as base64, and it all ends up in an NVARCHAR(MAX) column that every menu read
 * then drags across the wire. Downscaling to a kiosk tile's worth of pixels
 * turns that into tens of kilobytes and costs nothing anyone can see.
 *
 * `value` is whatever is stored — a data: URL, raw base64, or nothing. `onChange`
 * gives a data: URL for a new pick and `''` for a clear, which is exactly the
 * shape the API reads as "replace" and "remove".
 */

/** Longest edge, in pixels. A kiosk tile is ~320px on a 1080p screen. */
const MAX_EDGE = 640;
const QUALITY = 0.82;
/** Refuse the obviously-wrong file before spending time decoding it. */
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

async function toDownscaledDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is unavailable.');
    context.drawImage(bitmap, 0, 0, width, height);

    // PNG for anything with transparency, JPEG otherwise — a photo re-encoded
    // as PNG is several times the size for no gain.
    const type = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg';
    return canvas.toDataURL(type, QUALITY);
  } finally {
    bitmap.close();
  }
}

/** Stored artwork may be a bare base64 payload; <img> needs the data: prefix. */
export const imageSrc = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  return value.startsWith('data:') || value.startsWith('http') ? value : `data:image/png;base64,${value}`;
};

interface ImagePickerProps {
  value?: string | null;
  onChange: (value: string) => void;
  /** Shown in the empty frame — the emoji this image would replace. */
  fallback?: string;
  disabled?: boolean;
  className?: string;
}

export function ImagePicker({ value, onChange, fallback, disabled, className }: ImagePickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = imageSrc(value);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately: picking the same file twice must fire onChange twice.
    event.target.value = '';
    if (!file) return;

    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('That is not an image.');
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError('That image is over 12 MB. Try a smaller one.');
      return;
    }

    setBusy(true);
    try {
      onChange(await toDownscaledDataUrl(file));
    } catch {
      setError('That image could not be read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn('flex items-start gap-4', className)}>
      <div
        className={cn(
          'flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cream',
          'text-3xl leading-none',
        )}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden>{fallback || '🖼️'}</span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => input.current?.click()}
            className={cn(
              'press rounded-full bg-cream px-4 py-2 font-display text-xs font-bold text-charcoal',
              'transition-colors duration-150 hover:bg-mist',
              'disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            {busy ? 'Reading…' : preview ? 'Replace image' : 'Upload image'}
          </button>

          {preview && (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={() => {
                setError(null);
                onChange('');
              }}
              className={cn(
                'press rounded-full bg-flame-soft px-4 py-2 font-display text-xs font-bold text-flame',
                'transition-colors duration-150 hover:bg-flame hover:text-white',
                'disabled:pointer-events-none disabled:opacity-40',
              )}
            >
              Remove
            </button>
          )}
        </div>

        {error ? (
          <p className="text-xs font-medium text-flame">{error}</p>
        ) : (
          <p className="text-xs text-ash">
            Shown on the kiosk instead of the emoji. Scaled to {MAX_EDGE}px before it is saved.
          </p>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void pick(event)}
      />
    </div>
  );
}
