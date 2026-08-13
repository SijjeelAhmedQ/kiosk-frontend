import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Tooltip } from 'antd';
import { cn } from '@/utils/cn';

/**
 * Falls back to a throwaway textarea when the clipboard API isn't there.
 *
 * It usually is — but only in a secure context, and a back office opened
 * over plain http on a LAN address is not one, which is exactly where staff are
 * most likely to be copying codes out of the list.
 */
async function writeToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const scratch = document.createElement('textarea');
    scratch.value = value;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    document.body.appendChild(scratch);
    scratch.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      document.body.removeChild(scratch);
    }
  }
}

interface CopyButtonProps {
  value: string;
  /** Completes "Copy …" in the tooltip. */
  label?: string;
  className?: string;
}

/** Copies a value and says so for a moment. Sized to sit inline beside text. */
export function CopyButton({ value, label = 'code', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async (event: MouseEvent<HTMLButtonElement>) => {
    // Rows in the coupon list navigate on click; copying has to stay put.
    event.stopPropagation();
    if (!(await writeToClipboard(value))) return;

    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Tooltip title={copied ? 'Copied' : `Copy ${label}`}>
      <button
        type="button"
        onClick={(event) => void copy(event)}
        aria-label={copied ? 'Copied' : `Copy ${label}`}
        className={cn(
          'press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm leading-none',
          'transition-colors duration-150',
          copied ? 'bg-leaf-soft text-leaf' : 'text-ash hover:bg-mist hover:text-charcoal',
          className,
        )}
      >
        {copied ? '✓' : '⧉'}
      </button>
    </Tooltip>
  );
}
