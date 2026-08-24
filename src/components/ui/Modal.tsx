"use client";

import { ReactNode, useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidthClassName?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, maxWidthClassName = "max-w-md", children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClassName} rounded-card bg-card-bg/90 p-6 shadow-atmospheric backdrop-blur-xl outline-none`}
      >
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-bold text-heading">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-black/5 hover:text-heading"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
