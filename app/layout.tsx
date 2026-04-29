import type { Metadata } from "next";
import { Rubik, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemedToaster } from "@/components/ui/ThemedToaster";
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

// Inline FOUC-prevention script. Runs synchronously before React hydrates so
// the correct theme class is on <html> on first paint. Wrapped in try/catch
// so a private-mode storage exception cannot crash app boot.
const themeBootScript = `
(function () {
  try {
    var stored = null;
    try { stored = localStorage.getItem('recipes:theme-mode'); } catch (e) {}
    var mode = (stored === 'light' || stored === 'dark' || stored === 'auto') ? stored : 'auto';
    var prefersDark = false;
    try { prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) {}
    var resolved = mode === 'dark' || (mode === 'auto' && prefersDark) ? 'dark' : 'light';
    var html = document.documentElement;
    if (resolved === 'dark') html.classList.add('dark'); else html.classList.remove('dark');
    html.style.colorScheme = resolved;
  } catch (e) {}
})();
`.trim();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen bg-surface-100">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ThemedToaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
