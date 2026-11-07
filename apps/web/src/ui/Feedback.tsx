import { CloudOff, RefreshCw, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button, IconButton } from "./Button";
import { cx } from "./cx";
import { IconTile } from "./Surface";

const STROKE = 1.75;

interface AlertBannerProps {
  tone?: "critical" | "info";
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

// Critical alerts fill the width in solid red: the reference's subtle red dot isn't enough
// for an emergency (domain override 1).
export function AlertBanner({ tone = "critical", title, children, actions }: AlertBannerProps) {
  return (
    <div
      role="alert"
      className={cx(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card px-5 py-4",
        tone === "critical" ? "bg-critical-banner text-on-critical-banner" : "bg-info-soft text-info",
      )}
    >
      <TriangleAlert aria-hidden="true" size={24} strokeWidth={STROKE} />
      <div className="mr-auto min-w-0">
        <p className="font-display text-[17px] font-semibold leading-tight">{title}</p>
        {children && <p className="mt-0.5 text-[15px]">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// A short confirmation that slides up from the bottom and goes away on its own.
export function Toast({ message, open, onClose }: { message: string; open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [open, onClose]);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-center gap-3 rounded-full bg-inverse py-2 pl-5 pr-2 text-[15px] text-on-inverse shadow-float"
          >
            {message}
            <IconButton label="Dismiss" tone="inverse" onClick={onClose} className="h-9 w-9">
              <X size={18} strokeWidth={STROKE} />
            </IconButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
      className="m-auto w-[min(92vw,480px)] rounded-panel bg-card p-0 text-fg shadow-float backdrop:bg-inverse/40 backdrop:backdrop-blur-sm"
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
