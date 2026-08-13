import { create } from "zustand";
import { StorageKeys, loadString, saveString } from "@/lib/storage";

export type Theme = "light" | "dark";

interface ThemeState {
    theme: Theme;
    loadTheme: () => void;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

function applyThemeClass(theme: Theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: "light",

    loadTheme: () => {
        const stored = loadString(StorageKeys.theme, "light") as Theme;
        set({ theme: stored === "dark" ? "dark" : "light" });
        applyThemeClass(get().theme);
    },

    toggleTheme: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        set({ theme: next });
        saveString(StorageKeys.theme, next);
        applyThemeClass(next);
    },

    setTheme: (t) => {
        set({ theme: t });
        saveString(StorageKeys.theme, t);
        applyThemeClass(t);
    },
}));
