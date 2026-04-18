"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { getUserPreferences, saveUserPreferences } from "@/lib/firestore";
import type { TempUnit, VolumeUnit, UserPreferences } from "@/lib/types";
import { DEFAULT_PREFERENCES } from "@/lib/types";

interface UserPreferencesContextValue {
  tempUnit: TempUnit;
  volumeUnit: VolumeUnit;
  setTempUnit: (unit: TempUnit) => void;
  setVolumeUnit: (unit: VolumeUnit) => void;
  loaded: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue>({
  ...DEFAULT_PREFERENCES,
  setTempUnit: () => {},
  setVolumeUnit: () => {},
  loaded: false,
});

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_PREFERENCES);
      setLoaded(false);
      return;
    }
    getUserPreferences(user.uid).then((p) => {
      setPrefs(p);
      setLoaded(true);
    });
  }, [user]);

  const setTempUnit = useCallback((unit: TempUnit) => {
    setPrefs((prev) => ({ ...prev, tempUnit: unit }));
    if (user) saveUserPreferences(user.uid, { tempUnit: unit });
  }, [user]);

  const setVolumeUnit = useCallback((unit: VolumeUnit) => {
    setPrefs((prev) => ({ ...prev, volumeUnit: unit }));
    if (user) saveUserPreferences(user.uid, { volumeUnit: unit });
  }, [user]);

  return (
    <UserPreferencesContext.Provider value={{ ...prefs, setTempUnit, setVolumeUnit, loaded }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}
