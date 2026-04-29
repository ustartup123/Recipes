"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  BookOpen,
  Plus,
} from "lucide-react";
import Image from "next/image";
import { APP_VERSION } from "@/lib/version";

const navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/recipes", label: "המתכונים שלי", icon: BookOpen },
  { href: "/recipes/new", label: "מתכון חדש", icon: Plus },
];

export function Navbar() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-surface-100/80 backdrop-blur-md border-b border-surface-300/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-300 shadow-cta flex items-center justify-center text-white font-bold text-sm">
                מ
              </div>
              <span className="font-semibold text-ink-900 text-base hidden sm:block tracking-tight">
                מתכונים
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1 bg-surface-50/60 p-1 rounded-full shadow-soft border border-surface-300/50">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-surface-50 transition-all duration-150"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-surface-50 transition-colors cursor-pointer"
                  aria-label="User menu"
                >
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      width={32}
                      height={32}
                      className="rounded-full border-2 border-surface-50 shadow-soft"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sage-500 to-sage-300 flex items-center justify-center text-white text-xs font-bold shadow-soft">
                      {user?.displayName?.[0] || "U"}
                    </div>
                  )}
                  <span className="text-sm font-medium text-ink-700 hidden sm:block max-w-24 truncate">
                    {user?.displayName?.split(" ")[0] || "User"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-ink-500" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-surface-50 rounded-2xl shadow-hover py-2 z-50 animate-fade-in border border-surface-300/60">
                    <div className="px-4 py-2.5 border-b border-surface-300">
                      <p className="text-sm font-semibold text-ink-900 truncate">
                        {user?.displayName}
                      </p>
                      <p className="text-xs text-ink-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink-700 hover:text-ink-900 hover:bg-surface-200 transition-colors cursor-pointer"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                    <div className="border-t border-surface-300 px-4 pt-2 mt-1">
                      <p className="text-[10px] text-ink-500 tracking-wide">v{APP_VERSION}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              {navItems.length > 0 && (
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-2 rounded-full hover:bg-surface-50 text-ink-700 cursor-pointer transition-colors"
                  aria-label="Toggle mobile menu"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && navItems.length > 0 && (
          <div className="md:hidden border-t border-surface-300/60 bg-surface-50/80 backdrop-blur-md px-4 py-3">
            <div className="flex flex-col gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium text-ink-700 hover:text-ink-900 hover:bg-surface-200 transition-all cursor-pointer"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Backdrop for user menu */}
      {userMenuOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setUserMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
