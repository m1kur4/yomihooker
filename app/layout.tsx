import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeSync } from "./theme-sync";
import { Navbar } from "@/components/navbar";
import { DeckStatsProvider } from "@/lib/deck-stats-context";
import { SettingsProvider } from "@/lib/settings-context";
import { readConfigFile, configFileToSettings, configFileToDefaults } from "@/lib/read-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yomihook",
  description: "Japanese reading tool with text hooking, translation, TTS, and Anki mining",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cfg = readConfigFile();
  const initialSettings = configFileToSettings(cfg);
  const defaultSettings = configFileToDefaults(cfg);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {`document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);`}
        </Script>
        <SettingsProvider initialSettings={initialSettings} defaultSettings={defaultSettings}>
          <DeckStatsProvider>
            <ThemeSync />
            <Navbar />
            <div className="pt-14">{children}</div>
          </DeckStatsProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
