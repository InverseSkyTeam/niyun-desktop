
export const StorageKeys = {
    aiConfig: "ai-config",
    theme: "pet-theme",
    petStats: "niyun_pet_stats",
    reminderEnabled: "reminder-enabled",
    reminderInterval: "reminder-interval",
    petSettings: "pet-settings",
    workspaceRoot: "workspace-root",
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export function loadJSON<T>(key: StorageKey, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw == null) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function saveJSON(key: StorageKey, value: unknown): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
}

export function loadString(key: StorageKey, fallback: string): string {
    return localStorage.getItem(key) ?? fallback;
}

export function loadNumber(key: StorageKey, fallback: number): number {
    const n = parseInt(localStorage.getItem(key) ?? "", 10);
    return Number.isNaN(n) ? fallback : n;
}

export function loadBool(
    key: StorageKey,
    fallback: boolean,
    storedAs: "string" | "json" = "string",
): boolean {
    if (storedAs === "json") {
        return loadJSON<boolean>(key, fallback);
    }
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === "true";
}

export function saveString(key: StorageKey, value: string): void {
    localStorage.setItem(key, value);
}

export function saveNumber(key: StorageKey, value: number): void {
    localStorage.setItem(key, String(value));
}

export function saveBool(key: StorageKey, value: boolean): void {
    localStorage.setItem(key, String(value));
}
