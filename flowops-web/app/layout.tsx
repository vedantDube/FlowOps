import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "./components/ThemeProvider";
import { FaviconSync } from "./components/FaviconSync";
import { CustomCursor } from "@/components/magicui/custom-cursor";
import { CursorTrail } from "@/components/magicui/cursor-trail";
import { Toaster } from "sonner";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlowOps – AI Engineering Intelligence Platform",
  description:
    "Engineering analytics, AI code review, AutoDocs, and team insights in one unified SaaS platform.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

// Applied before hydration so the accent color is correct on first paint —
// mirrors what next-themes does internally for the .dark class, but for our
// separate [data-accent] attribute (see ThemeAccentPicker + globals.css).
const SET_ACCENT_SCRIPT = `
(function() {
  try {
    var accent = localStorage.getItem("flowops-accent");
    if (accent) document.documentElement.setAttribute("data-accent", accent);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SET_ACCENT_SCRIPT }} />
      </head>
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} font-sans bg-background text-foreground antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <FaviconSync />
          <AuthProvider>{children}</AuthProvider>
          <CustomCursor />
          <CursorTrail />
          <Toaster richColors position="top-right" closeButton theme="system" />
        </ThemeProvider>
      </body>
    </html>
  );
}
