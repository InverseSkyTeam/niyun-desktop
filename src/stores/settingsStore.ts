import { create } from "zustand";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import {
    StorageKeys,
    loadJSON,
    loadBool,
    loadNumber,
    loadString,
    saveBool,
    saveNumber,
    saveString,
    saveJSON,
} from "@/lib/storage";


export const DEFAULT_REMINDER_ENABLED = false;
export const DEFAULT_REMINDER_INTERVAL = 45;

export interface PetWindowSettings {
    fontSize: number;
    alwaysOnTop: boolean;
    autoStart: boolean;
    windowOpacity: number;
}

const DEFAULT_PET_SETTINGS: PetWindowSettings = {
    fontSize: 14,
    alwaysOnTop: false,
    autoStart: false,
    windowOpacity: 100,
};

interface SettingsState {
    reminderEnabled: boolean;
    reminderInterval: number;
    petSettings: PetWindowSettings;
    workspaceRoot: string | null;
    loadSettings: () => void;
    syncWindowState: () => Promise<void>;
    setReminderEnabled: (v: boolean) => void;
    setReminderInterval: (n: number) => void;
    setFontSize: (n: number) => void;
    setWindowOpacity: (n: number) => Promise<void>;
    setAlwaysOnTop: (v: boolean) => Promise<void>;
    setAutoStart: (v: boolean) => Promise<void>;
    setWorkspaceRoot: (path: string | null) => void;
    restoreWorkspace: () => Promise<void>;
}


function applyFontSize(size: number) {
    document.documentElement.style.setProperty("--chat-font-size", `${size}px`);
}


async function applyAutoStart(v: boolean) {
    try {
        if (v) {
            await enable();
        } else {
            await disable();
        }
    } catch {
    }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    reminderEnabled: DEFAULT_REMINDER_ENABLED,
    reminderInterval: DEFAULT_REMINDER_INTERVAL,
    petSettings: loadJSON<PetWindowSettings>(
        StorageKeys.petSettings,
        DEFAULT_PET_SETTINGS,
    ),
    workspaceRoot: null,

    loadSettings: () => {
        set({
            reminderEnabled: loadBool(StorageKeys.reminderEnabled, DEFAULT_REMINDER_ENABLED),
            reminderInterval: loadNumber(StorageKeys.reminderInterval, DEFAULT_REMINDER_INTERVAL),
            petSettings: loadJSON<PetWindowSettings>(StorageKeys.petSettings, DEFAULT_PET_SETTINGS),
            workspaceRoot: loadString(StorageKeys.workspaceRoot, "") || null,
        });
        applyFontSize(get().petSettings.fontSize);
        document.documentElement.style.setProperty(
            "--window-opacity",
            String(get().petSettings.windowOpacity / 100),
        );
    },

    
    restoreWorkspace: async () => {
        const saved = get().workspaceRoot;
        if (!saved) return;
        try {
            const ok = await invoke<boolean>("set_workspace_root", { path: saved });
            if (!ok) get().setWorkspaceRoot(null);
        } catch {
        }
    },

    
    syncWindowState: async () => {
        try {
            const win = getCurrentWindow();
            const alwaysOnTop = await win.isAlwaysOnTop();
            set((s) => ({
                petSettings: { ...s.petSettings, alwaysOnTop },
            }));
        } catch {
        }
    },

    setReminderEnabled: (v) => {
        set({ reminderEnabled: v });
        saveBool(StorageKeys.reminderEnabled, v);
    },

    setReminderInterval: (n) => {
        set({ reminderInterval: n });
        saveNumber(StorageKeys.reminderInterval, n);
    },

    setFontSize: (n) => {
        set((s) => ({ petSettings: { ...s.petSettings, fontSize: n } }));
        saveJSON(StorageKeys.petSettings, get().petSettings);
        applyFontSize(n);
    },

    setWindowOpacity: async (n) => {
        set((s) => ({ petSettings: { ...s.petSettings, windowOpacity: n } }));
        saveJSON(StorageKeys.petSettings, get().petSettings);
        document.documentElement.style.setProperty(
            "--window-opacity",
            String(n / 100),
        );
    },

    setAlwaysOnTop: async (v) => {
        set((s) => ({ petSettings: { ...s.petSettings, alwaysOnTop: v } }));
        saveJSON(StorageKeys.petSettings, get().petSettings);
        try {
            await getCurrentWindow().setAlwaysOnTop(v);
        } catch {
        }
    },

    setAutoStart: async (v) => {
        set((s) => ({ petSettings: { ...s.petSettings, autoStart: v } }));
        saveJSON(StorageKeys.petSettings, get().petSettings);
        await applyAutoStart(v);
    },

    setWorkspaceRoot: (path) => {
        set({ workspaceRoot: path });
        if (path) {
            saveString(StorageKeys.workspaceRoot, path);
        } else {
            localStorage.removeItem(StorageKeys.workspaceRoot);
        }
    },
}));


export async function initAutoStartState(): Promise<boolean> {
    try {
        return await isEnabled();
    } catch {
        return false;
    }
}
