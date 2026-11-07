import { LoaderCircle } from "lucide-react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "inherit";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-inverse text-on-inverse hover:shadow-lift",
  accent: "bg-accent text-on-accent hover:bg-accent-strong",
  secondary: "bg-card text-fg shadow-soft hover:shadow-lift",
  ghost: "text-fg-2 hover:bg-card-muted hover:text-fg",
  danger: "bg-critical-banner text-on-critical-banner hover:shadow-lift",
  // For buttons on a colored surface such as the critical banner: takes that surface's text color.
  inherit: "text-current underline underline-offset-4 hover:decoration-2",
};

const SIZES: Record<Size, string> = {
  md: "min-h-11 px-5 text-[15px]",
  lg: "min-h-13 px-6 text-[17px]",
};

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-display font-medium " +
  "transition-[transform,box-shadow,background-color,color] duration-fast ease-standard " +
  "active:scale-[0.97] active:duration-instant disabled:pointer-events-none disabled:opacity-45";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
  // Shows a spinner in place of the icon and blocks repeat presses while work is in progress.
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  loading = false,
  className,
  children,
  type = "button",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...rest}
    >
      {loading ? <LoaderCircle aria-hidden="true" size={18} strokeWidth={2} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

export interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

// A link that looks like a button, for actions that go somewhere (a page or a section) rather
// than change something. Same look and press feedback as Button.
export function LinkButton({ variant = "primary", size = "md", icon, fullWidth, className, children, ...rest }: LinkButtonProps) {
  return (
    <a className={cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)} {...rest}>
      {icon}
      {children}
    </a>
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
        "inline-flex h-11 w-11 shrink-0 items-center justify-center transition-[transform,box-shadow] duration-fast ease-standard active:scale-[0.94] active:duration-instant disabled:opacity-45",
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
