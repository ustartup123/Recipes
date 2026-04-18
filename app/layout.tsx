import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import { checkServerEnv } from "@/lib/env-check";

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const firaSans = Fira_Sans({
  subsets: ["latin"],
  variable: "--font-fira-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="he" dir="rtl" className={`dark ${firaCode.variable} ${firaSans.variable}`}>
      <body className="min-h-screen bg-slate-950">
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-left"
            toastOptions={{
              style: {
                background: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #334155",
                borderRadius: "10px",
                fontSize: "14px",
              },
              success: {
                iconTheme: { primary: "#14b8a6", secondary: "#f1f5f9" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#f1f5f9" },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
