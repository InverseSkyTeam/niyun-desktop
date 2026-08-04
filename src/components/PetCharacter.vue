<script setup lang="ts">
import { ref, computed } from "vue";
import type { PetStats } from "@/lib/petState";
import {
    getFestival,
    generateParticles,
    type FestivalConfig,
} from "@/lib/festival";
import { generateWeatherParticles, type WeatherCG } from "@/lib/weather";

type Mood = "neutral" | "happy" | "shy" | "angry" | "sleepy";

const props = defineProps<{
    mood?: Mood;
    petStats?: PetStats;
    isSleeping?: boolean;
    eating?: boolean;
    weatherCG?: WeatherCG | null;
}>();

const emit = defineEmits<{
    feed: [];
    pet: [];
    peek: [];
}>();

const squishing = ref(false);
const eatBone = ref(false);
let eatTimers: ReturnType<typeof setTimeout>[] = [];

const festival = computed<FestivalConfig | null>(() => getFestival());
const particles = computed(() =>
    festival.value ? generateParticles(festival.value) : [],
);
const weatherParticles = computed(() =>
    props.weatherCG ? generateWeatherParticles(props.weatherCG) : [],
);

const hungerPct = computed(() => Math.round(props.petStats?.hunger ?? 100));
const moodPct = computed(() => Math.round(props.petStats?.mood ?? 100));

const lowStatType = computed<"hunger" | "mood" | null>(() => {
    if (!props.petStats) return null;
    if (props.petStats.hunger < 20) return "hunger";
    if (props.petStats.mood < 20) return "mood";
    return null;
});

const moodZero = computed(() => (props.petStats?.mood ?? 100) <= 0);

const rainDrops = computed(() => {
    if (!moodZero.value) return [];
    const drops: {
        left: number;
        delay: number;
        duration: number;
        size: number;
    }[] = [];
    for (let i = 0; i < 35; i++) {
        drops.push({
            left: Math.random() * 100,
            delay: Math.random() * 3,
            duration: 0.6 + Math.random() * 0.8,
            size: 10 + Math.random() * 8,
        });
    }
    return drops;
});

function onPetClick() {
    squishing.value = true;
    emit("pet");
    setTimeout(() => {
        squishing.value = false;
    }, 150);
}

function feedPet() {
    emit("feed");
    eatTimers.forEach(clearTimeout);
    eatTimers = [];
    eatBone.value = false;
    eatTimers.push(
        setTimeout(() => {
            eatBone.value = true;
        }, 2000),
    );
    eatTimers.push(
        setTimeout(() => {
            eatBone.value = false;
        }, 4000),
    );
}
</script>

<template>
    <div class="pet-character-wrap">
        <div v-if="particles.length" class="festival-overlay">
            <span
                v-for="(p, i) in particles"
                :key="i"
                class="festival-particle"
                :class="festival?.animation"
                :style="{
                    left: p.left + '%',
                    animationDelay: p.delay + 's',
                    animationDuration: p.duration + 's',
                    fontSize: p.size + 'px',
                }"
                >{{ festival?.particle }}</span
            >
        </div>
        <div
            v-if="weatherCG && weatherParticles.length"
            class="weather-overlay"
        >
            <span
                v-for="(p, i) in weatherParticles"
                :key="'w' + i"
                class="weather-particle"
                :class="weatherCG.animation"
                :style="{
                    left: p.left + '%',
                    animationDelay: p.delay + 's',
                    animationDuration: p.duration + 's',
                    fontSize: p.size + 'px',
                }"
                >{{ weatherCG.particle }}</span
            >
        </div>

        <div class="pet-action-bar">
            <button class="action-btn" title="投喂" @click="feedPet">🍣</button>
            <button class="action-btn" title="摸头" @click="emit('pet')">
                ✋
            </button>
            <button class="action-btn" title="偷看屏幕" @click="emit('peek')">
                👁
            </button>
        </div>

        <div
            class="pet-area"
            :class="{ squishing: squishing }"
            @click="onPetClick"
        >
            <div
                class="pet-mood"
                :class="[
                    'mood-' + (mood || 'neutral'),
                    {
                        sleeping: isSleeping,
                        'low-stat': lowStatType,
                    },
                ]"
            >
                <img
                    src="/niyun.png"
                    alt="逆云"
                    class="pet-img"
                    draggable="false"
                />
            </div>

            <div v-if="isSleeping" class="cg-sleep">
                <span class="zzz z1">z</span>
                <span class="zzz z2">Z</span>
                <span class="zzz z3">Z</span>
            </div>

            <div v-if="lowStatType" class="cg-lowstat">
                <span class="lowstat-icon">{{
                    lowStatType === "hunger" ? "💢" : "💧"
                }}</span>
            </div>

            <div v-if="eating" class="cg-eat">
                <span class="eat-icon" :class="{ bone: eatBone }">{{
                    eatBone ? "🦴" : "🐟"
                }}</span>
            </div>

            <div v-if="moodZero" class="mood-zero-overlay"></div>
            <div v-if="moodZero" class="mood-zero-rain">
                <span
                    v-for="(d, i) in rainDrops"
                    :key="i"
                    class="rain-drop"
                    :style="{
                        left: d.left + '%',
                        animationDelay: d.delay + 's',
                        animationDuration: d.duration + 's',
                        fontSize: d.size + 'px',
                    }"
                    >💧</span
                >
            </div>
        </div>

        <div class="pet-stats">
            <div class="stat">
                <span class="stat-icon">🍣</span>
                <div class="stat-bar">
                    <div
                        class="stat-fill"
                        :style="{ width: hungerPct + '%' }"
                    ></div>
                </div>
            </div>
            <div class="stat">
                <span class="stat-icon">💖</span>
                <div class="stat-bar">
                    <div
                        class="stat-fill mood"
                        :style="{ width: moodPct + '%' }"
                    ></div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pet-character-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    pointer-events: auto;
}

.pet-action-bar {
    display: flex;
    gap: 4px;
    margin-bottom: 2px;
}

.action-btn {
    width: 26px;
    height: 26px;
    border: 1px solid var(--color-brand-200);
    border-radius: 8px;
    background: var(--color-brand-50);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
        background 0.12s ease,
        border-color 0.12s ease;
}

.action-btn:hover {
    background: var(--color-brand-100);
    border-color: var(--color-brand-300);
}

.dark .action-btn {
    background: var(--color-brand-800);
    border-color: var(--color-brand-700);
}

.dark .action-btn:hover {
    background: var(--color-brand-700);
}

.pet-area {
    position: relative;
    width: 80px;
    height: 88px;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pet-area.squishing {
    transform: scaleY(0.82) scaleX(1.15);
    transition: transform 0.1s ease-out;
}

.pet-mood {
    width: 100%;
    height: 100%;
    transition:
        filter 0.4s ease,
        transform 0.4s ease;
}

.pet-mood.sleeping {
    filter: brightness(0.55) saturate(0.7);
}

.pet-mood.low-stat {
    filter: grayscale(0.4) brightness(0.85);
}

.pet-mood.mood-happy {
    filter: brightness(1.08) saturate(1.15);
    animation: pet-bounce 0.7s ease-in-out;
}

.pet-mood.mood-shy {
    filter: hue-rotate(-15deg) saturate(1.4) brightness(1.05);
    animation: pet-shake 0.5s ease-in-out 2;
}

.pet-mood.mood-angry {
    filter: hue-rotate(-25deg) saturate(1.6) brightness(1.08);
    animation: pet-angry-shake 0.18s ease-in-out infinite;
}

.pet-mood.mood-sleepy {
    filter: brightness(0.82) saturate(0.8);
    animation: pet-slow-breathe 4.5s ease-in-out infinite;
}

.pet-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    animation: pet-breathe 3.2s ease-in-out infinite;
    user-select: none;
    -webkit-user-drag: none;
}

.pet-mood.mood-happy .pet-img {
    animation: pet-bounce 0.7s ease-in-out;
}

.pet-mood.mood-sleepy .pet-img {
    animation: pet-slow-breathe 4.5s ease-in-out infinite;
}

.pet-mood.mood-angry .pet-img {
    animation: pet-angry-shake 0.18s ease-in-out infinite;
}

.pet-mood.mood-shy .pet-img {
    animation: pet-shake 0.5s ease-in-out 2;
}

.cg-sleep {
    position: absolute;
    top: -4px;
    right: 0;
    pointer-events: none;
}

.zzz {
    position: absolute;
    font-size: 12px;
    font-weight: bold;
    color: var(--color-brand-400);
    animation: float-z 2.4s ease-in-out infinite;
}

.z1 {
    animation-delay: 0s;
    left: 0;
}
.z2 {
    animation-delay: 0.8s;
    left: 8px;
    font-size: 14px;
}
.z3 {
    animation-delay: 1.6s;
    left: 16px;
    font-size: 13px;
}

.cg-lowstat {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
}

.lowstat-icon {
    font-size: 14px;
    display: inline-block;
    animation: shake-icon 0.5s ease-in-out infinite;
}

.cg-eat {
    position: absolute;
    top: 50%;
    right: -8px;
    transform: translateY(-50%);
    pointer-events: none;
}

.eat-icon {
    font-size: 18px;
    display: inline-block;
    animation: eat-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.eat-icon.bone {
    animation: bone-fade 0.3s ease-out;
}

.pet-stats {
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 80px;
}

.stat {
    display: flex;
    align-items: center;
    gap: 4px;
}

.stat-icon {
    font-size: 10px;
    line-height: 1;
}

.stat-bar {
    flex: 1;
    height: 4px;
    background: var(--color-brand-200);
    border-radius: 2px;
    overflow: hidden;
}

.dark .stat-bar {
    background: var(--color-brand-700);
}

.stat-fill {
    height: 100%;
    background: var(--color-brand-400);
    border-radius: 2px;
    transition: width 0.5s ease;
}

.stat-fill.mood {
    background: var(--color-brand-500);
}

.festival-overlay {
    position: absolute;
    top: -20px;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
    z-index: 200;
}

.festival-particle {
    position: absolute;
    top: -20px;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
    opacity: 0.9;
    pointer-events: none;
}

.weather-overlay {
    position: absolute;
    inset: -20px;
    overflow: visible;
    pointer-events: none;
    z-index: 199;
}

.weather-particle {
    position: absolute;
    top: -24px;
    animation-iteration-count: infinite;
    animation-timing-function: linear;
    opacity: 0.85;
    line-height: 1;
    pointer-events: none;
}

.weather-fall {
    animation-name: weather-fall;
}
.weather-fall-slow {
    animation-name: weather-fall-slow;
    animation-timing-function: linear;
}
.weather-fall-fast {
    animation-name: weather-fall-fast;
    animation-timing-function: linear;
}
.weather-drift {
    animation-name: weather-drift;
}
.weather-flash {
    animation-name: weather-flash;
    animation-timing-function: ease-in-out;
}

.festival-fall {
    animation-name: festival-fall;
}

.mood-zero-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    pointer-events: none;
    z-index: 50;
    animation: overlay-fade-in 0.8s ease;
}

.mood-zero-rain {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 51;
}

.rain-drop {
    position: absolute;
    top: -20px;
    animation: rain-fall linear infinite;
    opacity: 0.7;
    line-height: 1;
}
</style>
