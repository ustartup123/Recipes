import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { UserPreferencesProvider } from "@/context/UserPreferencesContext";
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
  title: "AquaTrack — Freshwater Aquarium Tracker",
  description:
    "Track water parameters, manage multiple aquariums, and get AI-powered advice for your freshwater tanks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${firaCode.variable} ${firaSans.variable}`}>
      <body className="min-h-screen bg-slate-950">
        <AuthProvider>
          <UserPreferencesProvider>
          {children}
          </UserPreferencesProvider>
          <Toaster
            position="bottom-right"
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
