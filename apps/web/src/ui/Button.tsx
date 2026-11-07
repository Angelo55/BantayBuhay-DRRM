import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-inverse text-on-inverse hover:shadow-lift",
  accent: "bg-accent text-on-accent hover:bg-accent-strong",
  secondary: "bg-card text-fg shadow-soft hover:shadow-lift",
  ghost: "text-fg-2 hover:bg-card-muted hover:text-fg",
  danger: "bg-critical-banner text-on-critical-banner hover:shadow-lift",
};

const SIZES: Record<Size, string> = {
  md: "min-h-11 px-5 text-[15px]",
  lg: "min-h-13 px-6 text-[17px]",
};

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-display font-medium " +
  "transition-[transform,box-shadow,background-color,color] duration-200 ease-out-soft " +
  "active:scale-[0.97] active:duration-[120ms] disabled:pointer-events-none disabled:opacity-45";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shape?: "round" | "square";
  tone?: "card" | "inverse";
  children: ReactNode;
}

// An icon-only button. The label is required, because there's no visible text.
export function IconButton({
  label,
  shape = "round",
  tone = "card",
  className,
  children,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center transition-[transform,box-shadow] duration-200 ease-out-soft active:scale-[0.94] disabled:opacity-45",
        shape === "round" ? "rounded-full" : "rounded-control",
        tone === "card" ? "bg-card text-fg shadow-soft hover:shadow-lift" : "bg-inverse text-on-inverse",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
