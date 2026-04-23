"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/recipes" : "/login");
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-100">
      <LoadingSpinner className="h-8 w-8" />
    </div>
  );
}
