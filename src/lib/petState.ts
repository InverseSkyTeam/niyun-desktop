import { StorageKeys, loadJSON, saveJSON } from "./storage";

export type Mood = "neutral" | "happy" | "shy" | "angry" | "sleepy";

export interface PetStats {
    hunger: number;
    mood: number;
    lastUpdate: number;
}

const HUNGER_DECAY_MS = 5 * 60 * 60 * 1000;
const MOOD_DECAY_MS = 8 * 60 * 60 * 1000;

export function loadStats(): PetStats {
    return loadJSON<PetStats>(StorageKeys.petStats, {
        hunger: 80,
        mood: 80,
        lastUpdate: Date.now(),
    });
}

export function saveStats(s: PetStats): void {
    saveJSON(StorageKeys.petStats, s);
}

export function applyDecay(s: PetStats): PetStats {
    const now = Date.now();
    const elapsed = now - s.lastUpdate;
    if (elapsed <= 0) return s;
    const hungerLoss = (elapsed / HUNGER_DECAY_MS) * 100;
    const moodLoss = (elapsed / MOOD_DECAY_MS) * 100;
    return {
        hunger: Math.max(0, Math.min(100, s.hunger - hungerLoss)),
        mood: Math.max(0, Math.min(100, s.mood - moodLoss)),
        lastUpdate: now,
    };
}

export function feed(s: PetStats): PetStats {
    return { ...s, hunger: Math.min(100, s.hunger + 30) };
}

export function chatBoost(s: PetStats): PetStats {
    return { ...s, mood: Math.min(100, s.mood + 10) };
}

export function petBoost(s: PetStats): PetStats {
    return { ...s, mood: Math.min(100, s.mood + 5) };
}
