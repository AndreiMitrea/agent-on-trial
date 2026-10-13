export function HostLogin({ to, denied }: { to: string; denied?: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold">Host only</h1>
      <p className="text-neutral-400">Enter the host secret to open {to}.</p>
      <form method="post" action="/api/host" className="flex flex-col gap-4">
        <input type="hidden" name="to" value={to} />
        <input
          type="password"
          name="key"
          autoComplete="off"
          required
          placeholder="HOST_SECRET"
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-3 text-xl"
        />
        <button type="submit" className="rounded-lg bg-neutral-100 px-4 py-3 text-xl font-semibold text-neutral-950">
          Enter
        </button>
      </form>
      {denied && <p className="text-rose-400">That key did not match.</p>}
    </main>
  );
}
