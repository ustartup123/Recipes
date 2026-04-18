"use client";

import { useAuth } from "@/context/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { APP_VERSION } from "@/lib/version";
import { Settings, User } from "lucide-react";
import Image from "next/image";

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <AppShell>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-6 w-6 text-teal-400" />
        <h1 className="section-title text-2xl">Settings</h1>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Profile */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-slate-400" />
            <h2 className="font-bold font-mono text-slate-200 text-sm">Account</h2>
          </div>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || "User"}
                width={56}
                height={56}
                className="rounded-full border-2 border-slate-700"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-teal-500/20 border-2 border-teal-500/30 flex items-center justify-center text-teal-400 text-xl font-bold">
                {user?.displayName?.[0] || "U"}
              </div>
            )}
            <div>
              <p className="font-bold text-slate-100">{user?.displayName}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <p className="text-xs text-slate-600 mt-0.5">Signed in with Google</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button onClick={signOut} className="btn-danger text-sm">
              Sign Out
            </button>
          </div>
        </div>

        {/* App info */}
        <div className="card p-5">
          <h2 className="font-bold font-mono text-slate-200 text-sm mb-3">About</h2>
          <div className="space-y-1 text-xs text-slate-500">
            <p>Version {APP_VERSION}</p>
            <p>Built with Next.js 14, Firebase, and Tailwind CSS</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
