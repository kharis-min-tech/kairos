"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";


export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const pathname = usePathname();
 
const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Members", href: "/members" },
    { label: "Events", href: "/events" },
    { label: "Giving", href: "/giving" },
    { label: "Settings", href: "/settings" },
  ];




  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="font-semibold">Kairos Admin</div>

        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>Signed in</span>
          <button
            className="rounded-xl border border-gray-300 px-3 py-1.5 hover:bg-gray-50"
            onClick={() => alert("Sign out (UI only). Backend later.")}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3">
          <div className="rounded-2xl border border-gray-200 p-4">
            <div className="mb-3 text-xs font-semibold tracking-wider text-gray-500">
              NAVIGATION
            </div>

            <nav className="space-y-1">
  {navItems.map((item) => {
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`block rounded-lg px-3 py-2 text-sm transition ${
          isActive
            ? "bg-black text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {item.label}
      </Link>
    );
  })}
</nav>

          </div>
        </aside>

        {/* Page content */}
        <main className="col-span-12 md:col-span-9">{children}</main>
      </div>
    </div>
  );
}


