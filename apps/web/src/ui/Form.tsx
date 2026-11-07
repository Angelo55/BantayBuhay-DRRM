import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "./cx";

const CONTROL =
  "block w-full rounded-control border bg-card px-4 text-[15px] text-fg placeholder:text-fg-2 " +
  "transition-[border-color,box-shadow] duration-200 ease-out-soft disabled:opacity-60";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  // Receives the ids the control needs to connect to its label, hint and error.
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block font-display text-[15px] font-medium text-fg">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-[13px] text-fg-2">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children({ id, describedBy, invalid: Boolean(error) })}</div>
      {error && (
        <p id={errorId} className="mt-1.5 text-[13px] font-bold text-severity-critical-text">
          {error}
        </p>
      )}
    </div>
  );
}

type Invalid = { invalid?: boolean };

export function Input({ invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & Invalid) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, "min-h-12", invalid ? "border-severity-critical-text" : "border-border-ui", className)}
      {...rest}
    />
  );
}

export function Select({ invalid, className, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Invalid) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, "min-h-12", invalid ? "border-severity-critical-text" : "border-border-ui", className)}
      {...rest}
    />
  );
}

export function Textarea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Invalid) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, "py-3", invalid ? "border-severity-critical-text" : "border-border-ui", className)}
      {...rest}
    />
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

// A choice between a few options, shown as a pill track. Arrow keys move the choice.
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  function move(step: number) {
    const index = options.findIndex((option) => option.value === value);
    onChange(options[(index + step + options.length) % options.length]!.value);
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full bg-card-muted p-1"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") move(1);
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(-1);
      }}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              "min-h-10 rounded-full px-4 font-display text-[15px] font-medium transition-[background-color,box-shadow,color] duration-200 ease-out-soft",
              checked ? "bg-card text-fg shadow-soft" : "text-fg-2 hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
