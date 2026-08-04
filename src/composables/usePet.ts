import { ref } from "vue";
import { emit } from "@tauri-apps/api/event";
import {
    loadStats,
    saveStats,
    applyDecay,
    feed as petFeed,
    petBoost,
    type PetStats,
    type Mood,
} from "@/lib/petState";
import { fetchWeather, type WeatherCG } from "@/lib/weather";
import { getDesktopInfo, desktopInfoToPrompt } from "@/lib/desktopInfo";
import { getSystemPrompt } from "@/lib/db";
import { generateReply } from "@/lib/ai";

export interface UsePetOptions {
    getActiveModel: () => string;
    getActiveConversationId: () => string | null;
}

export function usePet(options: UsePetOptions) {
    const petMood = ref<Mood>("neutral");
    const petStats = ref<PetStats>(loadStats());
    const isSleeping = ref(false);
    const eating = ref(false);
    const weatherCG = ref<WeatherCG | null>(null);
    const reminderEnabled = ref(
        localStorage.getItem("reminder-enabled") !== "false",
    );
    const reminderInterval = ref(
        parseInt(localStorage.getItem("reminder-interval") || "45"),
    );

    let moodTimer: ReturnType<typeof setTimeout> | undefined;
    let decayTimer: ReturnType<typeof setInterval> | undefined;
    let sleepTimer: ReturnType<typeof setInterval> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    let weatherTimer: ReturnType<typeof setInterval> | undefined;
    let reminderTimer: ReturnType<typeof setInterval> | undefined;
    let feedCooldown = false;

    function parseMood(text: string): Mood {
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

    function setMood(m: Mood) {
        petMood.value = m;
        if (moodTimer) clearTimeout(moodTimer);
        if (m !== "neutral") {
            moodTimer = setTimeout(() => {
                petMood.value = "neutral";
            }, 3000);
        }
    }

    function wakeUp() {
        isSleeping.value = false;
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(
            () => {
                checkSleep();
            },
            5 * 60 * 1000,
        );
    }

    function checkSleep() {
        const h = new Date().getHours();
        isSleeping.value = h >= 22 || h < 7;
    }

    function handleFeed() {
        if (feedCooldown) return;
        feedCooldown = true;
        setTimeout(() => {
            feedCooldown = false;
        }, 30000);
        petStats.value = petFeed(petStats.value);
        saveStats(petStats.value);
        eating.value = true;
        setMood("happy");
        setTimeout(() => {
            eating.value = false;
        }, 4000);
        wakeUp();
    }

    function handlePet() {
        petStats.value = petBoost(petStats.value);
        saveStats(petStats.value);
        setMood("shy");
        wakeUp();
    }

    async function handlePeek() {
        const convId = options.getActiveConversationId();
        if (!convId) return;
        try {
            const info = await getDesktopInfo();
            const prompt = desktopInfoToPrompt(info);
            const systemPrompt = await getSystemPrompt(convId);
            const reply = await generateReply(
                `${prompt}\n\n[请用傲娇的语气吐槽用户现在在做什么，50字以内]`,
                options.getActiveModel(),
                systemPrompt,
            );
            emit("pet-speak", { text: reply, duration: 6000 });
            setMood(parseMood(reply));
            wakeUp();
        } catch (err) {
            console.error(err);
        }
    }

    function handleGalgameEffect(payload: {
        moodDelta: number;
        hungerDelta: number;
    }) {
        petStats.value = {
            ...petStats.value,
            mood: Math.max(
                0,
                Math.min(100, petStats.value.mood + payload.moodDelta),
            ),
            hunger: Math.max(
                0,
                Math.min(100, petStats.value.hunger + payload.hungerDelta),
            ),
        };
        saveStats(petStats.value);
    }

    function startReminder() {
        if (reminderTimer) clearInterval(reminderTimer);
        if (!reminderEnabled.value) return;
        const ms = reminderInterval.value * 60 * 1000;
        reminderTimer = setInterval(() => {
            const reminders = [
                "该喝水啦！起来倒杯水吧~",
                "坐太久啦，站起来活动活动！",
                "眼睛累了？看看远处休息一下~",
                "别忘了伸展一下身体哦！",
            ];
            const msg = reminders[Math.floor(Math.random() * reminders.length)];
            emit("pet-speak", { text: msg, duration: 5000 });
            setMood("happy");
        }, ms);
    }

    function refreshReminder() {
        reminderEnabled.value =
            localStorage.getItem("reminder-enabled") !== "false";
        reminderInterval.value = parseInt(
            localStorage.getItem("reminder-interval") || "45",
        );
        startReminder();
    }

    function startTickers() {
        petStats.value = applyDecay(petStats.value);
        saveStats(petStats.value);
        checkSleep();
        wakeUp();

        decayTimer = setInterval(() => {
            petStats.value = applyDecay(petStats.value);
            saveStats(petStats.value);
        }, 30000);

        sleepTimer = setInterval(() => {
            checkSleep();
        }, 60000);

        void (async () => {
            try {
                const snapshot = await fetchWeather();
                weatherCG.value = snapshot.cg;
            } catch {}
        })();

        weatherTimer = setInterval(
            async () => {
                try {
                    const snapshot = await fetchWeather();
                    weatherCG.value = snapshot.cg;
                } catch {}
            },
            60 * 60 * 1000,
        );

        startReminder();
    }

    function stopTickers() {
        if (moodTimer) clearTimeout(moodTimer);
        if (idleTimer) clearTimeout(idleTimer);
        if (decayTimer) clearInterval(decayTimer);
        if (sleepTimer) clearInterval(sleepTimer);
        if (weatherTimer) clearInterval(weatherTimer);
        if (reminderTimer) clearInterval(reminderTimer);
    }

    return {
        petMood,
        petStats,
        isSleeping,
        eating,
        weatherCG,
        parseMood,
        setMood,
        wakeUp,
        handleFeed,
        handlePet,
        handlePeek,
        handleGalgameEffect,
        refreshReminder,
        startTickers,
        stopTickers,
    };
}
