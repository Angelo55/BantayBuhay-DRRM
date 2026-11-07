import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton, STROKE } from "../ui";

interface PanelHeaderProps {
  titleId: string;
  title: string;
  // A badge or pill above the title.
  above?: ReactNode;
  meta?: ReactNode;
  closeLabel: string;
  onClose: () => void;
}

// The top of every side panel: a badge, a display title, one line of context and a close button.
export function PanelHeader({ titleId, title, above, meta, closeLabel, onClose }: PanelHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 px-6 pt-6">
      <div className="min-w-0">
        {above}
        <h2 id={titleId} className="mt-3 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.01em]">
          {title}
        </h2>
        {meta && <p className="mt-1.5 text-[15px] text-fg-2">{meta}</p>}
      </div>
      <IconButton label={closeLabel} shape="square" tone="inverse" onClick={onClose}>
        <X size={20} strokeWidth={STROKE} />
      </IconButton>
    </header>
  );
}

// A titled block inside a panel.
export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="font-display text-[15px] font-medium text-fg-2">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[15px] font-bold text-severity-critical-text">
      {children}
    </p>
  );
}
