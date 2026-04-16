"use client";

import { createContext, useContext, useState } from "react";

export type AppSettings = {
  lunatranslatorPort: number;
  voicevoxPort: number;
  voicevoxSpeaker: string;
  ankiPort: number;
};

type SettingsContextValue = {
  settings: AppSettings;
  defaultSettings: AppSettings;
  setSettings: (s: AppSettings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue>(null!);

export function SettingsProvider({
  children,
  initialSettings,
  defaultSettings,
}: {
  children: React.ReactNode;
  initialSettings: AppSettings;
  defaultSettings: AppSettings;
}) {
  const [settings, setSettingsState] = useState<AppSettings>(initialSettings);

  const setSettings = async (s: AppSettings) => {
    setSettingsState(s);
    await fetch("/api/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, defaultSettings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

/** Build the LunaTranslator WebSocket URL from the configured port. */
export function lunaWsUrl(port: number) {
  return `ws://localhost:${port}/api/ws/text/origin`;
}

/** Build the LunaTranslator translate URL from the configured port. */
export function lunaTranslateUrl(port: number) {
  return `http://127.0.0.1:${port}/api/translate`;
}
