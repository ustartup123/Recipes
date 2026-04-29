"use client";

import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { APP_VERSION } from "@/lib/version";
import { Settings, User, Palette } from "lucide-react";
import Image from "next/image";

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-300 flex items-center justify-center shadow-cta">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-ink-900 tracking-tight">
          Settings
        </h1>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Profile */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-4 w-4 text-ink-700" />
            <h2 className="font-bold text-ink-900 text-base">Account</h2>
          </div>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || "User"}
                width={64}
                height={64}
                className="rounded-2xl border-2 border-surface-50 shadow-soft"
              />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sage-500 to-sage-300 flex items-center justify-center text-white text-2xl font-bold shadow-soft">
                {user?.displayName?.[0] || "U"}
              </div>
            )}
            <div>
              <p className="font-bold text-ink-900 text-base">{user?.displayName}</p>
              <p className="text-sm text-ink-700">{user?.email}</p>
              <p className="text-xs text-ink-500 mt-0.5">Signed in with Google</p>
            </div>
          </div>
          <div className="mt-5 pt-5 border-t border-surface-300">
            <button onClick={signOut} className="btn-danger text-sm">
              Sign Out
            </button>
          </div>
        </div>

        {/* Display (theme) */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="h-4 w-4 text-ink-700" />
            <h2 className="font-bold text-ink-900 text-base">תצוגה</h2>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <ThemeToggle />
            <p className="text-xs text-ink-500">
              &quot;אוטומטי&quot; עוקב אחר הגדרת מערכת ההפעלה
            </p>
          </div>
        </div>

        {/* App info */}
        <div className="card p-6">
          <h2 className="font-bold text-ink-900 text-base mb-3">About</h2>
          <div className="space-y-1.5 text-sm text-ink-700">
            <p>Version {APP_VERSION}</p>
            <p>Built with Next.js 14, Firebase, and Tailwind CSS</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
