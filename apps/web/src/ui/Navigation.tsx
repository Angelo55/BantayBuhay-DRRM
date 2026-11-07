import type { Severity } from "@bantaybuhay/shared";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "./cx";
import { SPRING } from "./motion";
import { SeverityLabel } from "./Severity";
import { IconTile } from "./Surface";

export interface RailItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface RailProps {
  label: string;
  items: RailItem[];
  activeId: string;
  onSelect: (id: string) => void;
  // Vertical on wide screens, a bottom bar on phones.
  orientation?: "vertical" | "horizontal";
}

// The reference's black navigation pill. The active item sits in a butter square.
export function Rail({ label, items, activeId, onSelect, orientation = "vertical" }: RailProps) {
  return (
    <nav aria-label={label}>
      <ul
        className={cx(
          "flex items-center gap-2 bg-inverse p-2",
          orientation === "vertical" ? "flex-col rounded-rail py-4" : "justify-around rounded-full",
        )}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                title={item.label}
                className={cx(
                  "relative flex h-12 w-12 items-center justify-center rounded-control transition-colors duration-fast ease-standard",
                  active ? "text-on-accent" : "text-on-inverse-2 hover:text-on-inverse",
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`rail-active-${label}`}
                    transition={SPRING.gentle}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-control bg-accent"
                  />
                )}
                <span className="relative">{item.icon}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface ListCardProps {
  title: string;
  meta: string;
  tile: ReactNode;
  severity?: Severity;
  selected?: boolean;
  note?: string;
  onClick?: () => void;
}

// The reference's stacked card: a tile, a two-line title and a small meta line.
// Selected cards turn black. Severity shows as shape and word, never a lone dot.
export function ListCard({ title, meta, tile, severity, selected, note, onClick }: ListCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cx(
        "flex w-full items-center gap-4 rounded-card p-3 pr-4 text-left transition-[transform,box-shadow,background-color] duration-fast ease-standard hover:-translate-y-0.5 active:scale-[0.99] active:duration-instant",
        selected ? "bg-inverse text-on-inverse shadow-lift" : "bg-card-muted text-fg hover:shadow-lift",
      )}
    >
      <span className="flex flex-col items-center gap-1.5">
        <IconTile size={56}>{tile}</IconTile>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[15px] font-medium leading-tight">{title}</span>
        <span className={cx("mt-1 block text-[13px]", selected ? "text-on-inverse-2" : "text-fg-2")}>{meta}</span>
        {note && <span className={cx("mt-1 block text-[13px] font-bold", selected ? "text-on-inverse" : "text-fg")}>{note}</span>}
      </span>
      {severity && (
        <span className={cx("self-start rounded-full px-2 py-0.5", selected && "bg-card")}>
          <SeverityLabel severity={severity} />
        </span>
      )}
    </button>
  );
}

// A black callout pinned to a map point: a tile and two short lines.
export function MapCallout({ tile, title, detail }: { tile: ReactNode; title: string; detail: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-inverse py-1.5 pl-1.5 pr-5 text-on-inverse shadow-float">
      <IconTile size={40} tone="card">
        {tile}
      </IconTile>
      <span>
        <span className="block font-display text-[15px] font-medium leading-tight">{title}</span>
        <span className="block text-[13px] text-on-inverse-2">{detail}</span>
      </span>
    </div>
  );
}

// A small white label that sits on the map.
export function MapPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-card px-2.5 py-0.5 font-display text-[13px] font-medium text-fg shadow-soft">
      {children}
    </span>
  );
}
