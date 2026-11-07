import { useEffect, useState } from "react";
import { CivilianHome } from "./components/CivilianHome";
import { Console } from "./components/Console";
import { api, ApiError } from "./lib/api";
import { navigate } from "./lib/router";
import type { User } from "./lib/types";
import { ErrorState, Skeleton, useTheme } from "./ui";

type Session = { state: "loading" } | { state: "signed-in"; user: User } | { state: "error" };

export function App() {
  const [session, setSession] = useState<Session>({ state: "loading" });
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then(({ user }) => setSession({ state: "signed-in", user }))
      .catch((error: unknown) => {
        // Not signed in: the sign-in page brings people back here afterwards.
        if (error instanceof ApiError && error.status === 401) navigate("/login", { replace: true });
        else setSession({ state: "error" });
      });
  }, []);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    navigate("/login", { replace: true });
  }

  switch (session.state) {
    case "loading":
      return (
        <main className="grid min-h-dvh place-items-center bg-canvas px-4" aria-busy="true">
          <div className="w-full max-w-sm space-y-3">
            <p className="font-display text-[15px] font-medium text-fg-2">Loading BantayBuhay</p>
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 rounded-card" />
          </div>
        </main>
      );
    case "error":
      return (
        <main className="grid min-h-dvh place-items-center bg-canvas px-4 text-fg">
          <div className="w-full max-w-md">
            <ErrorState title="BantayBuhay can't reach its server" onRetry={() => window.location.reload()}>
              Check your connection, then try again. If the operations center is offline, use the radio or hotline.
            </ErrorState>
          </div>
        </main>
      );
    case "signed-in":
      return session.user.role === "civilian" ? (
        <CivilianHome user={session.user} theme={theme} onThemeChange={setTheme} onSignOut={signOut} />
      ) : (
        <Console user={session.user} theme={theme} onThemeChange={setTheme} onSignOut={signOut} />
      );
  }
}
