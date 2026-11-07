import type { User } from "../lib/types";

export function CivilianHome({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <main className="min-h-dvh bg-ground px-4 py-8 text-ink">
      <div className="mx-auto max-w-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[27px] font-bold leading-tight">BantayBuhay</h1>
            <p className="mt-1 text-[15px] text-muted">Signed in as {user.fullName}</p>
          </div>
          <button type="button" className="button-quiet" onClick={onSignOut}>
            Sign out
          </button>
        </div>
        <section className="mt-10 border-t border-line pt-6">
          <h2 className="text-[21px] font-bold">Your medical profile</h2>
          <p className="mt-2 text-[15px] text-muted">
            Soon you'll be able to record allergies, conditions and medicines responders should avoid.
            Only a responder assigned to your emergency will see them, and only while it's active.
          </p>
        </section>
      </div>
    </main>
  );
}
