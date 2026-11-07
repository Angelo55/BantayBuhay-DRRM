import { CloudOff, RefreshCw, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "./Button";
import { cx } from "./cx";
import { DISTANCE, SPRING, transition } from "./motion";
import { IconTile } from "./Surface";

const STROKE = 1.75;

interface AlertBannerProps {
  tone?: "critical" | "info";
  // High and critical banners pulse their icon; critical faster. Medium and low don't pulse.
  severity?: "high" | "critical";
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

// Critical alerts fill the width in solid red: the reference's subtle red dot isn't enough
// for an emergency (domain override 1). The banner arrives with a firm spring and its icon keeps
// pulsing until the incident is handled; the text never moves, so it can be read at once.
export function AlertBanner({ tone = "critical", severity, title, children, actions }: AlertBannerProps) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -DISTANCE.md, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING.alert}
      className={cx(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card px-5 py-4",
        tone === "critical" ? "bg-critical-banner text-on-critical-banner" : "bg-info-soft text-info",
      )}
    >
      <span className={cx("inline-flex rounded-full", severity && "pulse-ring")} data-severity={severity}>
        <TriangleAlert aria-hidden="true" size={24} strokeWidth={STROKE} />
      </span>
      <div className="mr-auto min-w-0">
        <p className="font-display text-[17px] font-semibold leading-tight">{title}</p>
        {children && <p className="mt-0.5 text-[15px]">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.div>
  );
}

export interface ToastItem {
  id: number;
  message: string;
}

const TOAST_MS = 4000;

// Toasts and their timers. show() returns nothing to await: toasts never block the next action.
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((item) => item.id !== id)), []);
  const show = useCallback((message: string) => {
    const id = next.current++;
    // At most three at once; the oldest goes first.
    setToasts((list) => [...list.slice(-2), { id, message }]);
  }, []);
  return { toasts, show, dismiss };
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const remaining = useRef(TOAST_MS);

  // Counts down only while the pointer or focus is elsewhere, so a toast being read stays put.
  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    const timer = setTimeout(() => onDismiss(item.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= performance.now() - startedAt;
    };
  }, [paused, item.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: DISTANCE.md }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: transition.exit }}
      transition={transition.enter}
      drag={reduced ? false : "x"}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        // Swipe it away on touch screens; the X button does the same for everyone else.
        if (Math.abs(info.offset.x) > 80) onDismiss(item.id);
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto relative flex touch-pan-y items-center gap-3 overflow-hidden rounded-full bg-inverse py-2 pr-2 pl-5 text-[15px] text-on-inverse shadow-float"
    >
      {item.message}
      <IconButton label="Dismiss" tone="inverse" onClick={() => onDismiss(item.id)} className="h-9 w-9">
        <X size={18} strokeWidth={STROKE} />
      </IconButton>
      {/* Time left, as a shrinking line. Decorative: the toast's text is what's announced. */}
      <span
        aria-hidden="true"
        className="toast-timer absolute inset-x-5 bottom-0 h-0.5 origin-left bg-on-inverse-2"
        style={{ animationDuration: `${TOAST_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </motion.div>
  );
}

// Confirmations stack at the bottom; new ones push older ones up, and each leaves on its own.
export function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// One toast, for simple cases.
export function Toast({ message, open, onClose }: { message: string; open: boolean; onClose: () => void }) {
  return <ToastStack toasts={open ? [{ id: 0, message }] : []} onDismiss={onClose} />;
}

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

// Built on <dialog>, which traps focus, closes on Escape and returns focus when it closes.
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="bb-dialog m-auto w-[min(92vw,480px)] rounded-panel bg-card p-0 text-fg shadow-float backdrop:bg-inverse/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <h2 id="modal-title" className="font-display text-[21px] font-semibold leading-tight">
          {title}
        </h2>
        <IconButton label="Close" shape="square" tone="inverse" onClick={onClose}>
          <X size={20} strokeWidth={STROKE} />
        </IconButton>
      </div>
      <div className="px-6 py-4 text-[15px]">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 px-6 pb-6">{footer}</div>}
    </dialog>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("skeleton rounded-control", className)} />;
}

interface StateProps {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

// Empty states invite the next step instead of just saying "nothing here".
export function EmptyState({ icon, title, children, action }: StateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card-muted p-6">
      <IconTile size={56}>{icon}</IconTile>
      <p className="font-display text-[18px] font-medium">{title}</p>
      <p className="max-w-[48ch] text-[15px] text-fg-2">{children}</p>
      {action}
    </div>
  );
}

export function ErrorState({ title, children, onRetry }: { title: string; children: ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-card-muted p-6">
      <IconTile size={56}>
        <TriangleAlert aria-hidden="true" size={24} strokeWidth={STROKE} className="text-severity-critical-text" />
      </IconTile>
      <p className="font-display text-[18px] font-medium">{title}</p>
      <p className="max-w-[48ch] text-[15px] text-fg-2">{children}</p>
      {onRetry && (
        <Button variant="secondary" icon={<RefreshCw size={18} strokeWidth={STROKE} />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function OfflineNotice({ since }: { since: string }) {
  return (
    <p role="status" className="inline-flex items-center gap-2 rounded-full bg-inverse px-4 py-2 text-[13px] text-on-inverse">
      <CloudOff aria-hidden="true" size={16} strokeWidth={STROKE} />
      Offline. Showing what was known at {since}. Reconnecting.
    </p>
  );
}
