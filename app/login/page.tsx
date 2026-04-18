"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Waves, Droplets, FlaskConical, Bot, Fish, Wrench } from "lucide-react";

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInAsDev } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isDev = process.env.NODE_ENV === "development";

  async function handleSignIn() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setError(e.code || e.message || "Sign-in failed");
    }
  }

  function handleDevSignIn() {
    signInAsDev();
    router.replace("/dashboard");
  }

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  const features = [
    { icon: FlaskConical, text: "Track pH, ammonia, nitrite, nitrate & more" },
    { icon: Waves, text: "Manage multiple aquariums in one place" },
    { icon: Droplets, text: "Log water changes with volume tracking" },
    { icon: Bot, text: "AI-powered water quality advisor" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      {/* Left — hero */}
      <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-10 lg:p-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(20,184,166,0.08)_0%,transparent_70%)]" />

        {/* Decorative circles */}
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-teal-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative z-10 max-w-md text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Fish className="h-6 w-6 text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-slate-100">
              Aqua<span className="text-teal-400">Track</span>
            </h1>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold font-mono text-slate-100 mb-4 leading-tight">
            Your aquarium,
            <br />
            <span className="text-teal-400">perfectly balanced.</span>
          </h2>
          <p className="text-slate-400 mb-10 text-lg leading-relaxed">
            Professional-grade water parameter tracking for freshwater hobbyists.
            Know your tank, protect your fish.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-teal-400" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — sign in */}
      <div className="flex items-center justify-center p-8 lg:p-16 lg:w-[420px]">
        <div className="w-full max-w-sm">
          <div className="card p-8 shadow-2xl">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold font-mono text-slate-100 mb-2">
                Sign in to AquaTrack
              </h3>
              <p className="text-sm text-slate-500">
                Track your water parameters and keep your fish happy
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl px-6 py-3.5 transition-all duration-150 cursor-pointer shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {isDev && (
              <button
                onClick={handleDevSignIn}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-sm rounded-xl px-6 py-3 transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <Wrench className="h-4 w-4" />
                Dev Sign In (test user)
              </button>
            )}

            <p className="text-center text-xs text-slate-600 mt-6">
              By signing in, you agree to our terms of service.
              <br />
              Your data is stored securely in Firebase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
