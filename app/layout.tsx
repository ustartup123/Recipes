import type { Metadata } from "next";
import { Rubik, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import { checkServerEnv } from "@/lib/env-check";

const rubik = Rubik({
  subsets: ["latin", "hebrew"],
  variable: "--font-rubik",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "700"],
});

checkServerEnv();

// This app uses Firebase Auth — no static prerendering
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "מתכונים",
  description: "ספריית המתכונים האישית שלי",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-surface-100">
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-left"
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#1a2332",
                border: "1px solid #e8dfd6",
                borderRadius: "16px",
                fontSize: "14px",
                boxShadow: "0 14px 40px -18px rgba(26, 35, 50, 0.25)",
              },
              success: {
                iconTheme: { primary: "#e07a33", secondary: "#ffffff" },
              },
              error: {
                iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
