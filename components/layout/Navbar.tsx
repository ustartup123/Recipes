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
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { APP_VERSION } from "@/lib/version";

// Add top-level nav entries here as you build them, e.g.
//   { href: "/dashboard", label: "Home", icon: Home },
const navItems: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];

export function Navbar() {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center group-hover:border-teal-500/60 transition-colors">
                <Sparkles className="h-4 w-4 text-teal-400" />
              </div>
              <span className="font-mono font-bold text-slate-100 text-sm hidden sm:block">
                Recipes
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all duration-150 cursor-pointer"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              ))}
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="User menu"
                >
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      width={28}
                      height={28}
                      className="rounded-full border border-slate-700"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 text-xs font-bold">
                      {user?.displayName?.[0] || "U"}
                    </div>
                  )}
                  <span className="text-xs text-slate-400 hidden sm:block max-w-24 truncate">
                    {user?.displayName?.split(" ")[0] || "User"}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-fade-in">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="text-xs font-medium text-slate-300 truncate">
                        {user?.displayName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </Link>
                    <button
                      onClick={() => { signOut(); setUserMenuOpen(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                    <div className="border-t border-slate-800 px-3 py-1.5">
                      <p className="text-[10px] text-slate-600 font-mono">v{APP_VERSION}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile menu toggle */}
              {navItems.length > 0 && (
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer transition-colors"
                  aria-label="Toggle mobile menu"
                >
                  {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && navItems.length > 0 && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3">
            <div className="grid grid-cols-2 gap-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
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
