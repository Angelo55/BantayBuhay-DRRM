import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import type { User } from "../lib/types";

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
    <main className="grid min-h-dvh place-items-center bg-ground px-4 py-10">
      <div className="w-full max-w-sm">
        <h1 className="text-[27px] font-bold leading-tight text-ink">BantayBuhay</h1>
        <p className="mt-1 text-[15px] text-muted">Kabankalan City incident response</p>

        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-[15px] font-bold text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field mt-1.5"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-[15px] font-bold text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field mt-1.5"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md border border-sev-critical/60 px-3 py-2 text-[15px] text-ink">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="button-primary w-full">
            {busy ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
