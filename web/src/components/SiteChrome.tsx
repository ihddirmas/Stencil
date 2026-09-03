import Link from "next/link";

export function SiteHeader({
  authed,
  email,
}: {
  authed?: boolean;
  email?: string | null;
}) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-5">
      <Link href={authed ? "/journal" : "/"} className="group flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--leaf)] text-sm font-bold text-white shadow-sm">
          S
        </span>
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold leading-none text-[var(--leaf-deep)]">
            Stencil
          </p>
          <p className="text-xs text-[var(--ink-soft)]">Agent · your words mapped</p>
        </div>
      </Link>

      <nav className="flex items-center gap-2 text-sm font-semibold">
        {authed ? (
          <>
            <Link className="rounded-lg px-3 py-2 hover:bg-white/70" href="/journal">
              Journal
            </Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-white/70" href="/entries">
              Entries
            </Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-white/70" href="/memory">
              Memory
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-[var(--line)] bg-white/80 px-3 py-2 text-[var(--ink-soft)]"
              >
                Sign out{email ? ` · ${email.split("@")[0]}` : ""}
              </button>
            </form>
          </>
        ) : (
          <>
            <Link className="rounded-lg px-3 py-2 hover:bg-white/70" href="/login">
              Log in
            </Link>
            <Link
              className="rounded-lg bg-[var(--leaf)] px-3.5 py-2 text-white shadow-sm"
              href="/signup"
            >
              Get started
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function Disclaimer() {
  return (
    <div
      role="note"
      className="bg-[var(--ink)] px-4 py-2 text-center text-[13px] text-[#e8f0eb]"
    >
      This is a psychoeducational reflection tool, not a diagnostic or therapeutic service.
    </div>
  );
}
