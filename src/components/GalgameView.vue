<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import {
    scenarios,
    type Scenario,
    type ScenarioNode,
    type ScenarioChoice,
} from "@/lib/scenarios";

const emit = defineEmits<{
    (e: "back"): void;
    (
        e: "galgame-effect",
        payload: { moodDelta: number; hungerDelta: number },
    ): void;
}>();

const screen = ref<"menu" | "play">("menu");
const currentScenario = ref<Scenario | null>(null);
const currentNode = ref<ScenarioNode | null>(null);
const typingText = ref("");
const isTyping = ref(false);
const showChoices = ref(false);
const ended = ref(false);
let typeTimer: ReturnType<typeof setInterval> | undefined;
let endTimer: ReturnType<typeof setTimeout> | undefined;

function clearTypeTimer() {
    if (typeTimer) {
        clearInterval(typeTimer);
        typeTimer = undefined;
    }
    isTyping.value = false;
}

function typeText(text: string) {
    clearTypeTimer();
    typingText.value = "";
    isTyping.value = true;
    showChoices.value = false;
    let i = 0;
    typeTimer = setInterval(() => {
        if (i < text.length) {
            typingText.value += text[i];
            i++;
        } else {
            clearTypeTimer();
            showChoices.value = true;
        }
    }, 28);
}

function goToNode(id: string) {
    const scenario = currentScenario.value;
    if (!scenario) return;
    const node = scenario.nodes.find((n) => n.id === id);
    if (!node) return;
    currentNode.value = node;
    typeText(node.text);
}

function skipOrAdvance() {
    if (ended.value) return;
    if (isTyping.value) {
        clearTypeTimer();
        typingText.value = currentNode.value?.text ?? "";
        showChoices.value = true;
        return;
    }
    const node = currentNode.value;
    if (!node) return;
    if (node.choices && node.choices.length > 0) return;
    if (node.end) {
        endScenario();
        return;
    }
    if (node.nextId) {
        goToNode(node.nextId);
    }
}

function selectChoice(choice: ScenarioChoice) {
    const moodDelta = choice.moodEffect ?? 0;
    const hungerDelta = choice.hungerEffect ?? 0;
    if (moodDelta !== 0 || hungerDelta !== 0) {
        emit("galgame-effect", { moodDelta, hungerDelta });
    }
    goToNode(choice.nextId);
}

function startScenario(scenario: Scenario) {
    currentScenario.value = scenario;
    currentNode.value = null;
    ended.value = false;
    typingText.value = "";
    screen.value = "play";
    goToNode(scenario.startNode);
}

function endScenario() {
    ended.value = true;
    clearTypeTimer();
    if (endTimer) clearTimeout(endTimer);
    endTimer = setTimeout(() => {
        ended.value = false;
        screen.value = "menu";
        currentScenario.value = null;
        currentNode.value = null;
        typingText.value = "";
        showChoices.value = false;
        endTimer = undefined;
    }, 1500);
}

function backToMenu() {
    clearTypeTimer();
    if (endTimer) {
        clearTimeout(endTimer);
        endTimer = undefined;
    }
    ended.value = false;
    screen.value = "menu";
    currentScenario.value = null;
    currentNode.value = null;
    typingText.value = "";
    showChoices.value = false;
}

onUnmounted(() => {
    clearTypeTimer();
    if (endTimer) clearTimeout(endTimer);
});
</script>

<template>
    <div class="galgame-root">
        <button
            v-if="screen === 'menu'"
            class="back-btn"
            @click="$emit('back')"
        >
            <span class="back-arrow">←</span>
            <span>返回聊天</span>
        </button>

        <div v-if="screen === 'menu'" class="menu-screen">
            <div class="menu-header">
                <div class="menu-emoji">📖</div>
                <h1 class="menu-title">剧情模式</h1>
                <p class="menu-subtitle">选一个故事，和逆云一起经历吧</p>
            </div>
            <div class="scenario-list">
                <button
                    v-for="s in scenarios"
                    :key="s.id"
                    class="scenario-card"
                    @click="startScenario(s)"
                >
                    <span class="scenario-icon">{{ s.icon }}</span>
                    <div class="scenario-info">
                        <div class="scenario-title">{{ s.title }}</div>
                        <div class="scenario-desc">{{ s.desc }}</div>
                    </div>
                    <span class="scenario-arrow">›</span>
                </button>
            </div>
        </div>

        <div v-else class="play-screen" @click="skipOrAdvance">
            <button class="back-btn play-back" @click.stop="backToMenu">
                <span class="back-arrow">←</span>
                <span>返回菜单</span>
            </button>

            <div class="pet-stage">
                <img
                    src="/niyun.png"
                    alt="逆云"
                    class="pet-sprite"
                    :class="'mood-' + (currentNode?.mood ?? 'neutral')"
                />
            </div>

            <div class="dialog-box">
                <template v-if="!ended">
                    <p class="dialog-text">
                        <span>{{ typingText }}</span>
                        <span v-if="isTyping" class="cursor">▌</span>
                    </p>
                    <div
                        v-if="showChoices && currentNode?.choices?.length"
                        class="choices"
                        @click.stop
                    >
                        <button
                            v-for="(c, i) in currentNode.choices"
                            :key="i"
                            class="choice-btn"
                            @click.stop="selectChoice(c)"
                        >
                            {{ c.text }}
                        </button>
                    </div>
                    <div
                        v-else-if="!isTyping && !currentNode?.choices?.length"
                        class="advance-hint"
                    >
                        点击继续 ▼
                    </div>
                </template>
                <div v-else class="end-text">—— 完 ——</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.galgame-root {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--color-brand-50);
    color: var(--color-brand-900);
    display: flex;
    flex-direction: column;
}
.dark .galgame-root {
    background: var(--color-brand-900);
    color: var(--color-brand-50);
}

.back-btn {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 20;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-brand-600);
    background: var(--color-brand-100);
    border: 1px solid var(--color-brand-200);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
}
.back-btn:hover {
    background: var(--color-brand-200);
    color: var(--color-brand-800);
}
.dark .back-btn {
    color: var(--color-brand-300);
    background: var(--color-brand-800);
    border-color: var(--color-brand-700);
}
.dark .back-btn:hover {
    background: var(--color-brand-700);
    color: var(--color-brand-100);
}
.back-arrow {
    font-size: 15px;
    line-height: 1;
}

.menu-screen {
    flex: 1;
    overflow-y: auto;
    padding: 56px 20px 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
}
.menu-header {
    text-align: center;
    margin-bottom: 24px;
}
.menu-emoji {
    font-size: 40px;
    margin-bottom: 8px;
}
.menu-title {
    font-size: 22px;
    font-weight: 700;
    margin: 0 0 6px;
    letter-spacing: 0.04em;
}
.menu-subtitle {
    font-size: 13px;
    color: var(--color-brand-500);
    margin: 0;
}
.dark .menu-subtitle {
    color: var(--color-brand-400);
}
.scenario-list {
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.scenario-card {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    text-align: left;
    background: #ffffff;
    border: 1px solid var(--color-brand-200);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.18s ease;
}
.scenario-card:hover {
    background: var(--color-brand-100);
    border-color: var(--color-brand-300);
    transform: translateY(-1px);
}
.dark .scenario-card {
    background: var(--color-brand-800);
    border-color: var(--color-brand-700);
}
.dark .scenario-card:hover {
    background: var(--color-brand-700);
    border-color: var(--color-brand-600);
}
.scenario-icon {
    font-size: 26px;
    line-height: 1;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-brand-100);
    border-radius: 12px;
}
.dark .scenario-icon {
    background: var(--color-brand-700);
}
.scenario-info {
    flex: 1;
    min-width: 0;
}
.scenario-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 2px;
}
.scenario-desc {
    font-size: 12px;
    color: var(--color-brand-500);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.dark .scenario-desc {
    color: var(--color-brand-400);
}
.scenario-arrow {
    font-size: 20px;
    color: var(--color-brand-300);
    flex-shrink: 0;
}
.dark .scenario-arrow {
    color: var(--color-brand-600);
}

.play-screen {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    background: linear-gradient(
        180deg,
        var(--color-brand-100) 0%,
        var(--color-brand-200) 100%
    );
    cursor: pointer;
    user-select: none;
}
.dark .play-screen {
    background: linear-gradient(
        180deg,
        var(--color-brand-800) 0%,
        var(--color-brand-950) 100%
    );
}
.play-back {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(6px);
}
.dark .play-back {
    background: rgba(24, 24, 27, 0.6);
}

.pet-stage {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 20px 20px;
}
.pet-sprite {
    width: 140px;
    height: 160px;
    object-fit: contain;
    pointer-events: none;
    -webkit-user-drag: none;
    transition: filter 0.3s ease;
    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.12));
}
.pet-sprite.mood-neutral {
    animation: pet-breathe 3s ease-in-out infinite;
}
.pet-sprite.mood-happy {
    filter: saturate(1.35) brightness(1.08)
        drop-shadow(0 8px 16px rgba(0, 0, 0, 0.12));
    animation: pet-bounce 1.6s ease-in-out infinite;
}
.pet-sprite.mood-shy {
    filter: sepia(0.25) saturate(1.3) hue-rotate(-8deg) brightness(1.03)
        drop-shadow(0 8px 16px rgba(0, 0, 0, 0.12));
    animation: pet-shake 2.4s ease-in-out infinite;
}
.pet-sprite.mood-angry {
    filter: saturate(1.6) hue-rotate(-25deg) brightness(1.05) contrast(1.05)
        drop-shadow(0 8px 16px rgba(0, 0, 0, 0.12));
    animation: pet-angry-shake 0.6s ease-in-out infinite;
}
.pet-sprite.mood-sleepy {
    filter: brightness(0.82) saturate(0.65)
        drop-shadow(0 8px 16px rgba(0, 0, 0, 0.12));
    animation: pet-slow-breathe 4s ease-in-out infinite;
}

.dialog-box {
    position: relative;
    margin: 0 16px 16px;
    padding: 18px 20px 20px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid var(--color-brand-200);
    border-radius: 16px;
    backdrop-filter: blur(8px);
    min-height: 120px;
    cursor: pointer;
}
.dark .dialog-box {
    background: rgba(24, 24, 27, 0.88);
    border-color: var(--color-brand-700);
}
.dialog-text {
    font-size: 15px;
    line-height: 1.75;
    color: var(--color-brand-800);
    margin: 0 0 14px;
    word-break: break-word;
}
.dark .dialog-text {
    color: var(--color-brand-100);
}
.cursor {
    display: inline-block;
    margin-left: 1px;
    color: var(--color-brand-400);
    animation: blink-cursor 0.9s steps(1) infinite;
}
.advance-hint {
    text-align: right;
    font-size: 12px;
    color: var(--color-brand-400);
    margin: 0;
    animation: blink-cursor 1.4s ease-in-out infinite;
}
.dark .advance-hint {
    color: var(--color-brand-500);
}

.choices {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 4px;
}
.choice-btn {
    width: 100%;
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 500;
    text-align: left;
    color: var(--color-brand-700);
    background: var(--color-brand-100);
    border: 1px solid var(--color-brand-200);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.15s ease;
}
.choice-btn:hover {
    background: var(--color-brand-200);
    border-color: var(--color-brand-400);
    color: var(--color-brand-900);
    transform: translateX(2px);
}
.dark .choice-btn {
    color: var(--color-brand-200);
    background: var(--color-brand-800);
    border-color: var(--color-brand-700);
}
.dark .choice-btn:hover {
    background: var(--color-brand-700);
    border-color: var(--color-brand-500);
    color: var(--color-brand-50);
}

.end-text {
    text-align: center;
    font-size: 20px;
    font-weight: 600;
    letter-spacing: 0.3em;
    color: var(--color-brand-600);
    padding: 28px 0;
    animation: fade-in 0.4s ease both;
}
.dark .end-text {
    color: var(--color-brand-300);
}

.menu-screen::-webkit-scrollbar {
    width: 6px;
}
.menu-screen::-webkit-scrollbar-track {
    background: transparent;
}
.menu-screen::-webkit-scrollbar-thumb {
    background: var(--color-brand-300);
    border-radius: 999px;
}
.dark .menu-screen::-webkit-scrollbar-thumb {
    background: var(--color-brand-700);
}
</style>
