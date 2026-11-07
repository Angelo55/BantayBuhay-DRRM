import { HeartPulse, LogOut } from "lucide-react";
import type { User } from "../lib/types";
import { Button, Card, IconTile, STROKE, StatusPill, ThemeToggle, type Theme } from "../ui";

interface CivilianHomeProps {
  user: User;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onSignOut: () => void;
}

export function CivilianHome({ user, theme, onThemeChange, onSignOut }: CivilianHomeProps) {
  const firstName = user.fullName.split(" ")[0] ?? user.fullName;
  return (
    <main className="min-h-dvh bg-canvas px-4 py-6 text-fg sm:py-10">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <p className="font-display text-[15px] font-medium text-fg-2">BantayBuhay</p>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onChange={onThemeChange} />
            <Button variant="ghost" icon={<LogOut size={18} strokeWidth={STROKE} />} onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </div>

        <h1 className="mt-10 font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">
          Hello, {firstName}
        </h1>
        <p className="mt-2 text-[15px] text-fg-2">Signed in as {user.fullName}</p>

        <Card tone="glass" shape="panel" className="mt-8 p-6 shadow-soft sm:p-8">
          <div className="flex items-start gap-4">
            <IconTile size={56}>
              <HeartPulse aria-hidden="true" size={24} strokeWidth={STROKE} />
            </IconTile>
            <div className="min-w-0">
              <StatusPill tone="accent">Coming soon</StatusPill>
              <h2 className="mt-3 font-display text-[21px] font-semibold leading-tight">Your medical profile</h2>
              <p className="mt-2 max-w-[52ch] text-[15px] text-fg-2">
                You'll be able to record allergies, conditions and medicines responders should avoid. Only a
                responder assigned to your emergency sees them, and only while it's active.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
