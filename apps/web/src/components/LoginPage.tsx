import { TriangleAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { User } from "../lib/types";
import { Button, Field, Input, STROKE } from "../ui";

export function LoginPage({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      onSignedIn(user);
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        setError("Too many attempts. Wait a minute, then try again.");
      } else if (caught instanceof ApiError && caught.status === 401) {
        setError("That email and password don't match an account.");
      } else {
        setError("Couldn't reach BantayBuhay. Check your connection and try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10 text-fg">
      <div className="w-full max-w-md">
        <div className="rounded-panel bg-card p-8 shadow-float sm:p-10">
          <p className="font-display text-[15px] font-medium text-fg-2">BantayBuhay</p>
          <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">
            Kabankalan City incident response
          </h1>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <Field label="Email">
              {({ id }) => (
                <Input
                  id={id}
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </Field>
            <Field label="Password">
              {({ id }) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </Field>
            {error && (
              <p role="alert" className="flex items-start gap-2 text-[15px] font-bold text-severity-critical-text">
                <TriangleAlert aria-hidden="true" size={20} strokeWidth={STROKE} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}
            <Button type="submit" fullWidth size="lg" disabled={busy}>
              {busy ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="mt-5 px-4 text-center text-[13px] text-fg-2">
          Can't sign in? Ask your DRRM administrator to check your account.
        </p>
      </div>
    </main>
  );
}
