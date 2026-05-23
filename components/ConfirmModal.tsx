'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button when modal opens; trap Escape key
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  const isDanger = variant === 'danger';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(7,11,22,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="card tick-corners w-full max-w-sm p-6 shadow-2xl"
        style={{
          background: 'var(--bg-card-hi)',
          border: `1px solid ${isDanger ? 'rgba(231,76,60,0.35)' : 'var(--line-hi)'}`,
          boxShadow: isDanger
            ? '0 0 40px rgba(231,76,60,0.12), 0 8px 32px rgba(0,0,0,0.6)'
            : '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        {/* Icon + title */}
        <div className="mb-4 flex items-start gap-3">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded"
            style={{
              background: isDanger ? 'rgba(231,76,60,0.12)' : 'var(--nr-orange-glow)',
              border: `1px solid ${isDanger ? 'rgba(231,76,60,0.3)' : 'rgba(224,82,6,0.3)'}`,
              color: isDanger ? 'var(--nr-red)' : 'var(--nr-orange)',
            }}
          >
            {isDanger ? <AlertTriangle size={15} /> : <Info size={15} />}
          </span>
          <div>
            <h2
              id="modal-title"
              className="text-[15px] font-semibold text-[var(--ink-100)]"
            >
              {title}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-400)]">
              {message}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-4 border-t border-[var(--line)]" />

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            className="btn btn-ghost"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="btn"
            style={
              isDanger
                ? {
                    background: 'rgba(231,76,60,0.15)',
                    borderColor: 'rgba(231,76,60,0.5)',
                    color: '#FF8077',
                  }
                : {
                    background: 'var(--nr-orange)',
                    borderColor: 'var(--nr-orange)',
                    color: '#fff',
                  }
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
