import type { ReactNode } from "react";
import { cx } from "./cx";

interface ChoiceCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  // Black for picking a thing (the reference's selected card), butter for picking an option.
  tone?: "inverse" | "accent";
  className?: string;
  children: ReactNode;
}

// A card-sized radio option. It wraps a real radio input, so arrow keys and screen readers
// work as they do for any radio group; the card shows the focus ring instead of the input.
export function ChoiceCard({ name, value, checked, onChange, tone = "accent", className, children }: ChoiceCardProps) {
  return (
    <label
      className={cx(
        "choice-card block min-h-12 cursor-pointer rounded-control px-4 py-3 transition-[background-color,box-shadow,color] duration-200 ease-out-soft",
        checked
          ? tone === "inverse"
            ? "bg-inverse text-on-inverse shadow-lift"
            : "bg-accent text-on-accent"
          : "bg-card-muted text-fg hover:shadow-lift",
        className,
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

// A fieldset whose legend looks like a field label.
export function ChoiceGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 font-display text-[15px] font-medium">{legend}</legend>
      {children}
    </fieldset>
  );
}
