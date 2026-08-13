import { create, type StoreApi } from "zustand";
import { emit } from "@tauri-apps/api/event";
import {
    loadStats,
    saveStats,
    applyDecay,
    feed as petFeed,
    petBoost,
    chatBoost,
    type PetStats,
    type Mood,
} from "@/lib/petState";
import { fetchWeather, type WeatherCG } from "@/lib/weather";
import { getDesktopInfo, desktopInfoToPrompt } from "@/lib/desktopInfo";
import { getSystemPrompt } from "@/lib/db";
import { generateReply } from "@/lib/ai";
import { useAIConfigStore } from "./aiConfigStore";
import { useChatStore } from "./chatStore";
import { useSettingsStore } from "./settingsStore";
import { isTauri } from "@/lib/tauri";


export function parseMood(text: string): Mood {
    const t = text.toLowerCase();
    if (t.includes(">w<") || t.includes("≧ω≦") || t.includes("(=＾･＾=)"))
        return "happy";
    if (
        text.includes("脸红") ||
        text.includes("害羞") ||
        text.includes(">//<") ||
        text.includes("(但其实")
    )
        return "shy";
    if (
        text.includes("炸毛") ||
        text.includes("怒") ||
        text.includes("气死") ||
        text.includes("哼") ||
        t.includes(">_<") ||
        t.includes("angry")
    )
        return "angry";
    if (
        text.includes("困") ||
        text.includes("睡") ||
        text.includes("累") ||
        t.includes("zzz")
    )
        return "sleepy";
    return "neutral";
}

function clampStat(value: number, delta: number): number {
    return Math.max(0, Math.min(100, value + delta));
}

function pickReminderMessage(): string {
    return REMINDER_MESSAGES[
        Math.floor(Math.random() * REMINDER_MESSAGES.length)
    ];
}


async function peekReply(convId: string): Promise<string> {
    const info = await getDesktopInfo();
    const prompt = desktopInfoToPrompt(info);
    const systemPrompt = await getSystemPrompt(convId);
    return generateReply(
        `${prompt}\n\n[请用傲娇的语气吐槽用户现在在做什么，50字以内]`,
        useAIConfigStore.getState().activeModel,
        systemPrompt,
    );
}

export interface PetStateSnapshot {
    mood: Mood;
    petStats: PetStats;
    isSleeping: boolean;
    eating: boolean;
    weatherCG: WeatherCG | null;
}

interface PetState {
    petMood: Mood;
    petStats: PetStats;
    isSleeping: boolean;
    eating: boolean;
    weatherCG: WeatherCG | null;

    setMood: (m: Mood) => void;
    wakeUp: () => void;
    handleFeed: () => void;
    handlePet: () => void;
    handlePeek: () => Promise<void>;
    handleGalgameEffect: (payload: {
        moodDelta: number;
        hungerDelta: number;
    }) => void;
    refreshReminder: () => void;
    startTickers: () => void;
    stopTickers: () => void;
    
    applySnapshot: (snap: PetStateSnapshot) => void;
}

type PetSetState = StoreApi<PetState>["setState"];
type PetGetState = () => PetState;


const timers: {
    mood?: ReturnType<typeof setTimeout>;
    idle?: ReturnType<typeof setTimeout>;
    decay?: ReturnType<typeof setInterval>;
    sleep?: ReturnType<typeof setInterval>;
    weather?: ReturnType<typeof setInterval>;
    reminder?: ReturnType<typeof setInterval>;
} = {};

function clearAllTimers() {
    if (timers.mood) clearTimeout(timers.mood);
    if (timers.idle) clearTimeout(timers.idle);
    if (timers.decay) clearInterval(timers.decay);
    if (timers.sleep) clearInterval(timers.sleep);
    if (timers.weather) clearInterval(timers.weather);
    if (timers.reminder) clearInterval(timers.reminder);
}

function checkSleep(): boolean {
    const h = new Date().getHours();
    return h >= 22 || h < 7;
}

const REMINDER_MESSAGES = [
    "该喝水啦！起来倒杯水吧~",
    "坐太久啦，站起来活动活动！",
    "眼睛累了？看看远处休息一下~",
    "别忘了伸展一下身体哦！",
];



function applyStatChange(set: PetSetState, get: PetGetState, next: PetStats, mood: Mood) {
    set({ petStats: next });
    saveStats(next);
    get().setMood(mood);
    get().wakeUp();
}

function scheduleMoodReset(set: PetSetState, m: Mood) {
    if (timers.mood) clearTimeout(timers.mood);
    if (m === "neutral") return;
    timers.mood = setTimeout(() => {
        set({ petMood: "neutral" });
    }, 3000);
}

function speakReminder(get: PetGetState) {
    const msg = pickReminderMessage();
    if (isTauri()) {
        emit("pet-speak", { text: msg, duration: 5000 });
    }
    get().setMood("happy");
}

function decayTick(set: PetSetState, get: PetGetState) {
    const next = applyDecay(get().petStats);
    set({ petStats: next });
    saveStats(next);
}

async function updateWeather(set: PetSetState) {
    try {
        const snapshot = await fetchWeather();
        set({ weatherCG: snapshot.cg });
    } catch {
        
    }
}

function setMoodAction(set: PetSetState, m: Mood) {
    set({ petMood: m });
    scheduleMoodReset(set, m);
}

function wakeUpAction(set: PetSetState) {
    set({ isSleeping: false });
    if (timers.idle) clearTimeout(timers.idle);
    timers.idle = setTimeout(() => {
        set({ isSleeping: checkSleep() });
    }, 5 * 60 * 1000);
}

function handleFeedAction(set: PetSetState, get: PetGetState) {
    applyStatChange(set, get, petFeed(get().petStats), "happy");
    set({ eating: true });
    setTimeout(() => set({ eating: false }), 4000);
}

function handlePetAction(set: PetSetState, get: PetGetState) {
    applyStatChange(set, get, petBoost(get().petStats), "shy");
}

async function handlePeekAction(get: PetGetState) {
    const convId = useChatStore.getState().activeId;
    if (!convId) return;
    try {
        const reply = await peekReply(convId);
        if (isTauri()) {
            emit("pet-speak", { text: reply, duration: 6000 });
        }
        get().setMood(parseMood(reply));
        get().wakeUp();
    } catch (err) {
        console.error(err);
    }
}

function handleGalgameEffectAction(
    set: PetSetState,
    get: PetGetState,
    { moodDelta, hungerDelta }: { moodDelta: number; hungerDelta: number },
) {
    const s = get();
    const next: PetStats = {
        ...s.petStats,
        mood: clampStat(s.petStats.mood, moodDelta),
        hunger: clampStat(s.petStats.hunger, hungerDelta),
    };
    set({ petStats: next });
    saveStats(next);
}

function refreshReminderAction(get: PetGetState) {
    const settings = useSettingsStore.getState();
    if (timers.reminder) clearInterval(timers.reminder);
    if (!settings.reminderEnabled) return;
    const ms = settings.reminderInterval * 60 * 1000;
    timers.reminder = setInterval(() => speakReminder(get), ms);
}

function startTickersAction(set: PetSetState, get: PetGetState) {
    clearAllTimers();
    const s = get();

    const stats = applyDecay(s.petStats);
    set({ petStats: stats });
    saveStats(stats);
    set({ isSleeping: checkSleep() });
    s.wakeUp();

    timers.decay = setInterval(() => decayTick(set, get), 30000);
    timers.sleep = setInterval(
        () => set({ isSleeping: checkSleep() }),
        60000,
    );
    void updateWeather(set);
    timers.weather = setInterval(() => void updateWeather(set), 60 * 60 * 1000);

    get().refreshReminder();
}

function applySnapshotAction(set: PetSetState, snap: PetStateSnapshot) {
    set({
        petMood: snap.mood,
        petStats: snap.petStats,
        isSleeping: snap.isSleeping,
        eating: snap.eating,
        weatherCG: snap.weatherCG,
    });
}


export const usePetStore = create<PetState>((set, get) => ({
    petMood: "neutral",
    petStats: loadStats(),
    isSleeping: false,
    eating: false,
    weatherCG: null,

    setMood: (m) => setMoodAction(set, m),
    wakeUp: () => wakeUpAction(set),
    handleFeed: () => handleFeedAction(set, get),
    handlePet: () => handlePetAction(set, get),
    handlePeek: () => handlePeekAction(get),
    handleGalgameEffect: (payload) => handleGalgameEffectAction(set, get, payload),
    refreshReminder: () => refreshReminderAction(get),
    startTickers: () => startTickersAction(set, get),
    stopTickers: clearAllTimers,
    applySnapshot: (snap) => applySnapshotAction(set, snap),
}));


export function onAssistantReply(text: string) {
    const s = usePetStore.getState();
    s.setMood(parseMood(text));
    const next = chatBoost(s.petStats);
    usePetStore.setState({ petStats: next });
    saveStats(next);
    s.wakeUp();
}
