"use client";

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import { Icon, ICONS } from "@/components/ui/Icon";

type ToastVariant = "default" | "success" | "error";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  onClick?: () => void;
}

interface Toast extends Required<Pick<ToastOptions, "title" | "variant" | "duration">> {
  id: string;
  description?: string;
  leaving: boolean;
  onClick?: () => void;
}

interface ToastContextValue {
  toast: (input: string | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const DEFAULT_DURATION = 5000;

const VARIANT_STYLES: Record<ToastVariant, { icon: keyof typeof ICONS; iconBg: string; iconFg: string }> = {
  default: { icon: "notifications", iconBg: "bg-accent-blue-bg", iconFg: "text-accent-blue-fg" },
  success: { icon: "check", iconBg: "bg-accent-blue-bg", iconFg: "text-accent-blue-fg" },
  error: { icon: "alertCircle", iconBg: "bg-error-container", iconFg: "text-error" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    // Let the exit transition play before dropping it from the list.
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, 200);
  }, []);

  const toast = useCallback(
    (input: string | ToastOptions) => {
      const opts: ToastOptions = typeof input === "string" ? { title: input } : input;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const duration = opts.duration ?? DEFAULT_DURATION;

      setToasts((prev) => [
        ...prev,
        {
          id,
          title: opts.title,
          description: opts.description,
          variant: opts.variant ?? "default",
          duration,
          leaving: false,
          onClick: opts.onClick,
        },
      ]);

      const timer = setTimeout(() => remove(id), duration);
      timers.current.set(id, timer);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-60 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4">
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              role={t.onClick ? "button" : "status"}
              tabIndex={t.onClick ? 0 : undefined}
              onClick={t.onClick}
              onKeyDown={
                t.onClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") t.onClick!();
                    }
                  : undefined
              }
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card bg-card-bg p-4 shadow-atmospheric transition-all duration-200 ${
                t.onClick ? "cursor-pointer hover:shadow-md" : ""
              } ${t.leaving ? "translate-x-4 opacity-0" : "translate-x-0 opacity-100"}`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.iconBg} ${style.iconFg}`}>
                <Icon path={ICONS[style.icon]} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-heading">{t.title}</p>
                {t.description && <p className="mt-0.5 text-xs text-muted">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const timer = timers.current.get(t.id);
                  if (timer) clearTimeout(timer);
                  remove(t.id);
                }}
                aria-label="Dismiss"
                className="shrink-0 rounded-full p-1 text-muted hover:bg-input-bg hover:text-heading"
              >
                <Icon path={ICONS.close} className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
