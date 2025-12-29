"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCognitoAuth } from "../../hooks/use-cognito-auth";
import { AuthGuard } from "../../components/auth-guard";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { getUserInfo, signOutComplete, isAuthenticated, isLoading } = useCognitoAuth();
  const [isClient, setIsClient] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "fa-solid fa-home" },
    { label: "Members", href: "/members", icon: "fa-solid fa-users" },
    { label: "Events", href: "/events", icon: "fa-solid fa-calendar" },
    { label: "Giving", href: "/giving", icon: "fa-solid fa-heart" },
    { label: "Settings", href: "/settings", icon: "fa-solid fa-cog" },
  ];

  const handleSignOut = () => {
    signOutComplete();
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const userInfo = getUserInfo();

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-church text-2xl text-neutral-800"></i>
              <span className="text-lg text-neutral-800">KCMS</span>
            </div>

            <div className="flex items-center gap-3">
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <div className="w-6 h-6 bg-neutral-800 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-user text-white text-xs"></i>
                  </div>
                  <span className="text-sm text-neutral-700 hidden md:block">
                    {userInfo?.email?.split('@')[0] || "User"}
                  </span>
                  <i className="fa-solid fa-chevron-down text-neutral-400 text-xs"></i>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b border-neutral-200">
                      <p className="text-sm font-medium text-neutral-900">{userInfo?.email}</p>
                      <p className="text-xs text-neutral-500">
                        {userInfo?.emailVerified ? 'Verified Account' : 'Pending Verification'}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        className="flex items-center px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fa-solid fa-user mr-2 text-neutral-500"></i>
                        Profile
                      </Link>
                      <Link
                        href="/auth/mfa-setup"
                        className="flex items-center px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fa-solid fa-shield-alt mr-2 text-neutral-500"></i>
                        Security
                      </Link>
                      <Link
                        href="/auth/change-password"
                        className="flex items-center px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <i className="fa-solid fa-key mr-2 text-neutral-500"></i>
                        Change Password
                      </Link>
                      <div className="border-t border-neutral-200 my-1"></div>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleSignOut();
                        }}
                        className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <i className="fa-solid fa-sign-out-alt mr-2"></i>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-6">
          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-3">
            <div className="rounded-lg border border-neutral-200 p-4">
              <div className="mb-3 text-xs font-semibold tracking-wider text-neutral-500">
                NAVIGATION
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition ${
                        isActive
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      <i className={item.icon}></i>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Profile Section */}
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <div className="mb-3 text-xs font-semibold tracking-wider text-neutral-500">
                  ACCOUNT
                </div>
                <nav className="space-y-1">
                  <Link
                    href="/profile"
                    className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition ${
                      pathname === "/profile"
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <i className="fa-solid fa-user"></i>
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/auth/mfa-setup"
                    className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition ${
                      pathname === "/auth/mfa-setup"
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <i className="fa-solid fa-shield-alt"></i>
                    <span>Security</span>
                  </Link>
                </nav>
              </div>
            </div>
          </aside>

          {/* Page content */}
          <main className="col-span-12 md:col-span-9">{children}</main>
        </div>

        {/* Click outside to close menu */}
        {showUserMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowUserMenu(false)}
          ></div>
        )}
      </div>
    </AuthGuard>
  );
}


