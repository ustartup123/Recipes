"use client";

import { Toaster } from "react-hot-toast";
import { useTheme } from "@/context/ThemeContext";

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Toaster
      position="bottom-left"
      toastOptions={{
        style: {
          background: isDark ? "#241d18" : "#ffffff",
          color: isDark ? "#f5ede4" : "#1a2332",
          border: isDark ? "1px solid #2e2620" : "1px solid #e8dfd6",
          borderRadius: "16px",
          fontSize: "14px",
          boxShadow: isDark
            ? "0 14px 40px -18px rgba(0, 0, 0, 0.6)"
            : "0 14px 40px -18px rgba(26, 35, 50, 0.25)",
        },
        success: {
          iconTheme: {
            primary: isDark ? "#e88a4c" : "#e07a33",
            secondary: isDark ? "#241d18" : "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#dc2626",
            secondary: isDark ? "#241d18" : "#ffffff",
          },
        },
      }}
    />
  );
}
