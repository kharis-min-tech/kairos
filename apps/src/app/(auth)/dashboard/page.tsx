import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="font-semibold">Kairos Admin</div>
          <div className="text-sm text-gray-600">Signed in</div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-12">
        {/* Sidebar */}
        <aside className="md:col-span-3">
          <nav className="rounded-2xl border bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase text-gray-500">
              Navigation
            </div>

            <ul className="space-y-2 text-sm">
              <li className="rounded-xl bg-gray-100 px-3 py-2 font-medium">
                Dashboard
              </li>
              <li className="rounded-xl px-3 py-2 text-gray-600 hover:bg-gray-50">
                Members
              </li>
              <li className="rounded-xl px-3 py-2 text-gray-600 hover:bg-gray-50">
                Events
              </li>
              <li className="rounded-xl px-3 py-2 text-gray-600 hover:bg-gray-50">
                Giving
              </li>
              <li className="rounded-xl px-3 py-2 text-gray-600 hover:bg-gray-50">
                Settings
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main */}
        <section className="md:col-span-9">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            This is a UI-only placeholder for the protected area.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm text-gray-600">Members</div>
              <div className="mt-2 text-2xl font-semibold">1,284</div>
              <div className="mt-1 text-xs text-gray-500">+12 this week</div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm text-gray-600">Events</div>
              <div className="mt-2 text-2xl font-semibold">6</div>
              <div className="mt-1 text-xs text-gray-500">Upcoming</div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm text-gray-600">Giving</div>
              <div className="mt-2 text-2xl font-semibold">£4,930</div>
              <div className="mt-1 text-xs text-gray-500">This month</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-4">
            <div className="mt-4 flex flex-wrap gap-3">
  <Link
    href="/events"
    className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90 active:opacity-80"
  >
    Create event
  </Link>

  <Link
    href="/members"
    className="rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50"
  >
    Add member
  </Link>

  <Link
    href="/giving"
    className="rounded-xl border border-gray-300 px-4 py-2 hover:bg-gray-50"
  >
    View reports
  </Link>
</div>

            </div>
        
        </section>
      </div>
    </main>
  );
}
