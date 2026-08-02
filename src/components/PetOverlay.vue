<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { type UnlistenFn } from "@tauri-apps/api/event";
import type { PetStats } from "../petState";
import { getFestival, generateParticles, type FestivalConfig } from "../festival";
import { generateWeatherParticles, type WeatherCG } from "../weather";

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

const localMood = ref<Mood | null>(null);
const displayMood = computed(() => localMood.value ?? props.mood ?? "neutral");
let localMoodTimer: ReturnType<typeof setTimeout> | undefined;
let moveDebounce: ReturnType<typeof setTimeout> | undefined;

const festival = computed<FestivalConfig | null>(() => getFestival());
const particles = computed(() => festival.value ? generateParticles(festival.value) : []);
const weatherParticles = computed(() => props.weatherCG ? generateWeatherParticles(props.weatherCG) : []);

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
    const drops: { left: number; delay: number; duration: number; size: number }[] = [];
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

const petAreaRef = ref<HTMLElement | null>(null);
const menuVisible = ref(false);
const menuPos = ref({ x: 0, y: 0 });

function feedPet() {
    emit("feed");
    menuVisible.value = false;
    eatTimers.forEach(clearTimeout);
    eatTimers = [];
    eatBone.value = false;
    eatTimers.push(setTimeout(() => { eatBone.value = true; }, 2000));
    eatTimers.push(setTimeout(() => {
        eatBone.value = false;
    }, 4000));
}

function openMenu(e: MouseEvent) {
    menuVisible.value = true;
    const w = 130;
    const maxH = window.innerHeight - 20;
    const h = Math.min(200, maxH);
    let x = e.clientX;
    let y = Math.max(4, Math.min(e.clientY, window.innerHeight - h - 4));
    if (x + w > window.innerWidth) x = window.innerWidth - w - 4;
    menuPos.value = { x, y };
}

function onPetMouseDown(e: MouseEvent) {
    if (e.button === 0) {
        squishing.value = true;
        localMood.value = "shy";
        if (localMoodTimer) clearTimeout(localMoodTimer);
        localMoodTimer = setTimeout(() => { localMood.value = null; }, 3000);
        emit("pet");
        getCurrentWindow().startDragging();
        if (moveDebounce) clearTimeout(moveDebounce);
        moveDebounce = setTimeout(() => { squishing.value = false; }, 150);
    }
}

const win = getCurrentWindow();
let ignoring = false;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let ignoreStuckSince = 0;

const petCanvas = document.createElement("canvas");
const petCtx = petCanvas.getContext("2d", { willReadFrequently: true });
let petImageLoaded = false;

function loadPetImage() {
    const img = new Image();
    img.onload = () => {
        petCanvas.width = 180;
        petCanvas.height = 198;
        petCtx?.drawImage(img, 0, 0, 180, 198);
        petImageLoaded = true;
    };
    img.src = "/niyun.png";
}

function isTransparentAt(x: number, y: number): boolean {
    if (menuVisible.value) {
        return false;
    }
    if (petAreaRef.value) {
        const r = petAreaRef.value.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && x >= r.left && x < r.right && y >= r.top && y < r.bottom) {
            if (!petImageLoaded || !petCtx) return false;
            const localX = Math.floor(x - r.left);
            const localY = Math.floor(y - r.top);
            if (localX < 0 || localX >= 180 || localY < 0 || localY >= 198) return true;
            const pixel = petCtx.getImageData(localX, localY, 1, 1).data;
            return pixel[3] < 128;
        }
    }
    return true;
}

async function setPassthrough(ignore: boolean) {
    if (ignoring === ignore) return;
    ignoring = ignore;
    ignoreStuckSince = ignore ? Date.now() : 0;
    await win.setIgnoreCursorEvents(ignore);
}

async function onMouseMovePassthrough(e: MouseEvent) {
    await setPassthrough(isTransparentAt(e.clientX, e.clientY));
}

async function pollCursor() {
    try {
        if (ignoring && ignoreStuckSince > 0 && Date.now() - ignoreStuckSince > 5000) {
            await setPassthrough(false);
            return;
        }
        const [cx, cy] = await invoke<[number, number]>("get_cursor_pos");
        const winPos = await win.outerPosition();
        const scaleFactor = await win.scaleFactor();
        const localX = (cx - winPos.x) / scaleFactor;
        const localY = (cy - winPos.y) / scaleFactor;
        const wantIgnore = isTransparentAt(localX, localY);
        if (wantIgnore !== ignoring) {
            await setPassthrough(wantIgnore);
        }
    } catch {}
}

let unlistenMove: UnlistenFn | undefined;

onMounted(async () => {
    loadPetImage();
    unlistenMove = await win.onMoved(() => {
        if (moveDebounce) clearTimeout(moveDebounce);
        moveDebounce = setTimeout(() => {
            squishing.value = false;
        }, 80);
    });
    document.addEventListener("mousemove", onMouseMovePassthrough);
    pollTimer = setInterval(pollCursor, 100);
});

onUnmounted(() => {
    unlistenMove?.();
    eatTimers.forEach(clearTimeout);
    if (moveDebounce) clearTimeout(moveDebounce);
    if (localMoodTimer) clearTimeout(localMoodTimer);
    document.removeEventListener("mousemove", onMouseMovePassthrough);
    if (pollTimer) clearInterval(pollTimer);
});

watch(() => props.mood, (m) => {
    if (m && m !== "neutral") {
        localMood.value = null;
    }
});
</script>

<template>
    <div class="pet-overlay-root" @mousedown="menuVisible = false">
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
            >{{ festival?.particle }}</span>
        </div>
        <div v-if="weatherCG && weatherParticles.length" class="weather-overlay">
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
            >{{ weatherCG.particle }}</span>
        </div>

        <div
            ref="petAreaRef"
            class="pet-area"
            :class="{ squishing: squishing }"
            @mousedown="onPetMouseDown"
            @contextmenu.prevent="openMenu"
            @click="menuVisible = false"
        >
            <div
                class="pet-mood"
                :class="[
                    'mood-' + displayMood,
                    {
                        sleeping: isSleeping,
                        'low-stat': lowStatType,
                    },
                ]"
            >
                <div class="pet-img"></div>
            </div>

            <div v-if="isSleeping" class="cg-sleep">
                <span class="zzz z1">z</span>
                <span class="zzz z2">Z</span>
                <span class="zzz z3">Z</span>
            </div>

            <div v-if="lowStatType" class="cg-lowstat">
                <span class="lowstat-icon">{{ lowStatType === 'hunger' ? '💢' : '💧' }}</span>
            </div>

            <div v-if="eating" class="cg-eat">
                <span class="eat-icon" :class="{ bone: eatBone }">{{ eatBone ? '🦴' : '🐟' }}</span>
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
                >💧</span>
            </div>

            <div class="pet-stats">
                <div class="stat">
                    <span class="stat-icon">🍣</span>
                    <div class="stat-bar"><div class="stat-fill" :style="{ width: hungerPct + '%' }"></div></div>
                </div>
                <div class="stat">
                    <span class="stat-icon">💖</span>
                    <div class="stat-bar"><div class="stat-fill mood" :style="{ width: moodPct + '%' }"></div></div>
                </div>
            </div>
        </div>

        <div
            v-if="menuVisible"
            class="context-menu"
            :style="{ left: menuPos.x + 'px', top: menuPos.y + 'px' }"
            @mousedown.stop
        >
            <button class="menu-item" @click="feedPet">投喂小鱼干</button>
            <button
                class="menu-item"
                @click="
                    emit('peek');
                    menuVisible = false;
                "
            >
                偷看屏幕
            </button>
            <button
                class="menu-item"
                @click="
                    emit('pet');
                    menuVisible = false;
                "
            >
                摸摸头
            </button>
        </div>
    </div>
</template>

<style scoped>
.pet-overlay-root {
    position: relative;
    width: 100%;
    height: 100%;
    background: transparent;
    pointer-events: none;
}

.pet-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 180px;
    height: 198px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: auto;
}

.pet-area.squishing {
    transform: scaleY(0.82) scaleX(1.15);
    transition: transform 0.1s ease-out;
}

.pet-stats {
    position: absolute;
    bottom: 4px;
    left: 8px;
    right: 8px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    pointer-events: none;
}

.stat {
    display: flex;
    align-items: center;
    gap: 4px;
}

.stat-icon {
    font-size: 11px;
    line-height: 1;
}

.stat-bar {
    flex: 1;
    height: 5px;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 3px;
    overflow: hidden;
}

.stat-fill {
    height: 100%;
    background: #d4a574;
    border-radius: 3px;
    transition: width 0.5s ease;
}

.stat-fill.mood {
    background: #c8a8d8;
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
    background-image: url("/niyun.png");
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
    animation: pet-breathe 3.2s ease-in-out infinite;
}

.cg-sleep {
    position: absolute;
    top: 10px;
    right: 20px;
    pointer-events: none;
}

.zzz {
    position: absolute;
    font-size: 14px;
    font-weight: bold;
    color: rgba(200, 168, 216, 0.8);
    animation: float-z 2.4s ease-in-out infinite;
}

.z1 { animation-delay: 0s; left: 0; }
.z2 { animation-delay: 0.8s; left: 10px; font-size: 18px; }
.z3 { animation-delay: 1.6s; left: 20px; font-size: 16px; }

@keyframes float-z {
    0% { transform: translateY(0) scale(0.6); opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 0.6; }
    100% { transform: translateY(-30px) scale(1.1); opacity: 0; }
}

.cg-lowstat {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
}

.lowstat-icon {
    font-size: 16px;
    display: inline-block;
    animation: shake-icon 0.5s ease-in-out infinite;
}

@keyframes shake-icon {
    0%, 100% { transform: rotate(-8deg) translateY(0); }
    50% { transform: rotate(8deg) translateY(-3px); }
}

.cg-eat {
    position: absolute;
    top: 50%;
    right: -10px;
    transform: translateY(-50%);
    pointer-events: none;
}

.eat-icon {
    font-size: 22px;
    display: inline-block;
    animation: eat-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.eat-icon.bone {
    animation: bone-fade 0.3s ease-out;
}

@keyframes eat-pop {
    0% { transform: scale(0) rotate(-20deg); opacity: 0; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes bone-fade {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}

.festival-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
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
    inset: 0;
    overflow: hidden;
    pointer-events: none;
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

@keyframes overlay-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
}

@keyframes rain-fall {
    0% { transform: translateY(0) translateX(0); opacity: 0; }
    10% { opacity: 0.8; }
    100% { transform: translateY(260px) translateX(-10px); opacity: 0; }
}

.context-menu {
    position: absolute;
    z-index: 100;
    width: 130px;
    background: rgba(250, 245, 240, 0.96);
    border: 1px solid rgba(212, 165, 116, 0.5);
    border-radius: 10px;
    padding: 4px;
    box-shadow: 0 6px 20px rgba(212, 165, 116, 0.2);
    pointer-events: auto;
}

.menu-item {
    width: 100%;
    padding: 8px 0;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: #5c4a3d;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.12s ease;
}

.menu-item:hover {
    background: rgba(212, 165, 116, 0.25);
}
</style>
