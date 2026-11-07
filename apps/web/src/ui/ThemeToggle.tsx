import { Moon, Sun } from "lucide-react";
import { IconButton } from "./Button";
import { STROKE } from "./icons";
import type { Theme } from "./theme";

// Switches between the light default and the dark theme.
export function ThemeToggle({
  theme,
  onChange,
  tone = "card",
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  tone?: "card" | "inverse";
}) {
  const next = theme === "light" ? "dark" : "light";
  return (
    <IconButton label={`Switch to ${next} theme`} tone={tone} onClick={() => onChange(next)}>
      {theme === "light" ? <Moon size={20} strokeWidth={STROKE} /> : <Sun size={20} strokeWidth={STROKE} />}
    </IconButton>
  );
}
