import { useEffect, useState } from "react";
import { CivilianHome } from "./components/CivilianHome";
import { Console } from "./components/Console";
import { LoginPage } from "./components/LoginPage";
import { api, ApiError } from "./lib/api";
import type { User } from "./lib/types";

type Session = { state: "loading" } | { state: "signed-out" } | { state: "signed-in"; user: User } | { state: "error" };

export function App() {
  const [session, setSession] = useState<Session>({ state: "loading" });

  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then(({ user }) => setSession({ state: "signed-in", user }))
      .catch((error: unknown) =>
        setSession(error instanceof ApiError && error.status === 401 ? { state: "signed-out" } : { state: "error" }),
      );
  }, []);

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setSession({ state: "signed-out" });
  }

  switch (session.state) {
    case "loading":
      return <p className="grid min-h-dvh place-items-center bg-ground text-muted">Loading BantayBuhay</p>;
    case "error":
      return (
        <main className="grid min-h-dvh place-items-center bg-ground px-4 text-ink">
          <div className="max-w-sm">
            <h1 className="text-[21px] font-bold">BantayBuhay can't reach its server</h1>
            <p className="mt-2 text-[15px] text-muted">Check your connection, then reload the page.</p>
          </div>
        </main>
      );
    case "signed-out":
      return <LoginPage onSignedIn={(user) => setSession({ state: "signed-in", user })} />;
    case "signed-in":
      return session.user.role === "civilian" ? (
        <CivilianHome user={session.user} onSignOut={signOut} />
      ) : (
        <Console user={session.user} onSignOut={signOut} />
      );
  }
}
