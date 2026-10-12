'use client';

import { forwardRef, useCallback, useLayoutEffect, useRef, TextareaHTMLAttributes } from 'react';

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  /** Wraps like a textarea but keeps the value on one line: Enter is ignored, pasted breaks become spaces. */
  singleLine?: boolean;
};

/** Textarea that grows with its content so long entries stay in view. */
const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea(
  { value, onChange, singleLine = false, rows = 1, className = 'textarea', onKeyDown, style, ...rest },
  forwarded,
) {
  const inner = useRef<HTMLTextAreaElement | null>(null);

  const fit = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = `${el.scrollHeight + border}px`;
  }, []);

  useLayoutEffect(fit, [value, fit]);

  // Width changes (rotation, sidebar, window resize) change the wrap, so refit.
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        fit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  return (
    <textarea
      {...rest}
      ref={(el) => {
        inner.current = el;
        if (typeof forwarded === 'function') forwarded(el);
        else if (forwarded) forwarded.current = el;
      }}
      rows={rows}
      className={className}
      style={{ resize: 'none', overflow: 'hidden', ...style }}
      value={value}
      onChange={(e) => onChange(singleLine ? e.target.value.replace(/\r?\n/g, ' ') : e.target.value)}
      onKeyDown={(e) => {
        if (singleLine && e.key === 'Enter') e.preventDefault();
        onKeyDown?.(e);
      }}
    />
  );
});

export default AutoTextarea;
