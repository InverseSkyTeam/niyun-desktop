<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, defineAsyncComponent } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import {
    chatBoost,
    saveStats,
    type Mood,
    type PetStats,
} from "@/lib/petState";
import type { WeatherCG } from "@/lib/weather";
import Sidebar from "@/components/Sidebar.vue";
import TitleBar from "@/components/TitleBar.vue";
import MessageList from "@/components/MessageList.vue";
import ChatInput from "@/components/ChatInput.vue";
const Settings = defineAsyncComponent(
    () => import("@/components/Settings.vue"),
);
const GalgameView = defineAsyncComponent(
    () => import("@/components/GalgameView.vue"),
);
const PetOverlay = defineAsyncComponent(
    () => import("@/components/PetOverlay.vue"),
);
const ToolApprovalBar = defineAsyncComponent(
    () => import("@/components/ToolApprovalBar.vue"),
);
import { useTheme } from "@/composables/useTheme";
import { useAIConfig } from "@/composables/useAIConfig";
import { usePet } from "@/composables/usePet";
import { useChat } from "@/composables/useChat";

const isPetView =
    new URLSearchParams(window.location.search).get("view") === "pet";

const { theme, toggleTheme, setTheme, loadTheme } = useTheme();
const { activeModel, aiModelGroups, selectModel, refreshAIConfig } =
    useAIConfig();

const pet = usePet({
    getActiveModel: () => activeModel.value,
    getActiveConversationId: () => chat.activeId.value,
});
const {
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
} = pet;

const chat = useChat({
    getActiveModel: () => activeModel.value,
    onAssistantReply: (text) => {
        setMood(parseMood(text));
        petStats.value = chatBoost(petStats.value);
        saveStats(petStats.value);
        wakeUp();
    },
});
const {
    conversations,
    activeId,
    messages,
    input,
    isThinking,
    approvalRequests,
    initConversations,
    newConversation,
    openConversation,
    removeConversation,
    sendMessage,
    handleApprove,
    handleDeny,
    stopGeneration,
    copyMessage,
    isStreaming,
} = chat;

const appWindow = (() => {
    try {
        return getCurrentWindow();
    } catch {
        return null;
    }
})();

const view = ref<"chat" | "settings" | "galgame">("chat");

function regenerateMessage(_id: string) {}

function togglePin() {
    if (!appWindow) return;
    void (async () => {
        try {
            const pinned = await appWindow.isAlwaysOnTop();
            await appWindow.setAlwaysOnTop(!pinned);
        } catch (err) {
            console.error("切换置顶失败", err);
        }
    })();
}
function windowMinimize() {
    void appWindow?.minimize();
}
function windowClose() {
    void appWindow?.close();
}
function openSettings() {
    view.value = "settings";
}
function openGalgame() {
    view.value = "galgame";
}
function backToChat() {
    view.value = "chat";
    refreshAIConfig();
    refreshReminder();
}
function openChatConversation(id: string) {
    view.value = "chat";
    openConversation(id);
}
function newChat() {
    view.value = "chat";
    void newConversation();
}

let petOverlayUnlisten: UnlistenFn | undefined;

function broadcastPetState() {
    if (isPetView) return;
    emit("pet-state", {
        mood: petMood.value,
        petStats: petStats.value,
        isSleeping: isSleeping.value,
        eating: eating.value,
        weatherCG: weatherCG.value,
    });
}

async function openPetOverlay() {
    if (isPetView) return;
    const existing = await WebviewWindow.getByLabel("pet");
    if (existing) {
        await existing.show();
        await existing.setFocus();
        broadcastPetState();
        return;
    }
    new WebviewWindow("pet", {
        url: "/index.html?view=pet",
        title: "逆云桌宠",
        width: 600,
        height: 600,
        decorations: false,
        resizable: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        shadow: false,
        center: false,
        x: 80,
        y: 120,
    });
}

onMounted(async () => {
    if (isPetView) {
        petOverlayUnlisten = await listen("pet-state", (e) => {
            const p = e.payload as {
                mood: Mood;
                petStats: PetStats;
                isSleeping: boolean;
                eating: boolean;
                weatherCG: WeatherCG | null;
            };
            petMood.value = p.mood;
            petStats.value = p.petStats;
            isSleeping.value = p.isSleeping;
            eating.value = p.eating;
            weatherCG.value = p.weatherCG;
        });
        return;
    }

    loadTheme();
    startTickers();
    void initConversations().catch((err) => console.error(err));

    setTimeout(() => {
        openPetOverlay();
        setTimeout(broadcastPetState, 500);
    }, 1000);

    petOverlayUnlisten = await listen("pet-interact", (e) => {
        const action = e.payload as "feed" | "pet" | "peek";
        if (action === "feed") handleFeed();
        else if (action === "pet") handlePet();
        else if (action === "peek") handlePeek();
    });
});

watch(
    [petMood, petStats, isSleeping, eating, weatherCG],
    () => {
        broadcastPetState();
    },
    { deep: true },
);

watch(view, (v) => {
    if (v === "chat") refreshAIConfig();
});

onUnmounted(() => {
    stopTickers();
    petOverlayUnlisten?.();
});
</script>

<template>
    <PetOverlay
        v-if="isPetView"
        :mood="petMood"
        :pet-stats="petStats"
        :is-sleeping="isSleeping"
        :eating="eating"
        :weather-c-g="weatherCG"
        @feed="emit('pet-interact', 'feed')"
        @pet="emit('pet-interact', 'pet')"
        @peek="emit('pet-interact', 'peek')"
    />
    <div
        v-else
        class="relative flex h-screen w-screen overflow-hidden bg-canvas font-sans text-brand-900 antialiased dark:bg-ink dark:text-brand-50"
    >
        <div class="pointer-events-none fixed inset-0 overflow-hidden">
            <div
                class="absolute -top-40 -left-40 size-[28rem] rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-700/20"
            />
            <div
                class="absolute top-1/3 -right-40 size-[24rem] rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-600/15"
            />
            <div
                class="absolute bottom-0 left-1/3 size-[20rem] rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-600/10"
            />
        </div>
        <div class="relative z-10 flex h-full w-full">
            <template v-if="view === 'chat'">
                <Sidebar
                    :conversations="conversations"
                    :active-id="activeId"
                    :is-streaming="isStreaming"
                    @new-chat="newChat"
                    @select="openChatConversation"
                    @delete="removeConversation"
                    @open-settings="openSettings"
                    @open-galgame="openGalgame"
                />

                <div class="relative flex min-w-0 flex-1 flex-col">
                    <TitleBar
                        :title="
                            conversations.find((c) => c.id === activeId)
                                ?.title ?? '逆云'
                        "
                        :is-thinking="isThinking"
                        @toggle-theme="toggleTheme"
                        @toggle-pin="togglePin"
                        @window-minimize="windowMinimize"
                        @window-close="windowClose"
                    />

                    <MessageList
                        :messages="messages"
                        :is-thinking="isThinking"
                        @regenerate="regenerateMessage"
                        @copy="copyMessage"
                        @suggestion="(t) => (input = t)"
                    />

                    <ToolApprovalBar
                        v-if="approvalRequests.length > 0"
                        :requests="approvalRequests"
                        @approve="handleApprove"
                        @deny="handleDeny"
                    />

                    <ChatInput
                        v-model="input"
                        :is-thinking="isThinking"
                        :ai-model="activeModel"
                        :ai-model-groups="aiModelGroups"
                        @send="sendMessage"
                        @stop="stopGeneration"
                        @select-model="selectModel"
                    />
                </div>
            </template>

            <template v-else-if="view === 'galgame'">
                <Sidebar
                    :conversations="conversations"
                    :active-id="activeId"
                    :is-streaming="isStreaming"
                    @new-chat="newChat"
                    @select="openChatConversation"
                    @delete="removeConversation"
                    @open-settings="openSettings"
                    @open-galgame="openGalgame"
                />
                <div class="flex min-w-0 flex-1 flex-col">
                    <TitleBar
                        title="视觉小说"
                        :is-thinking="isThinking"
                        @toggle-theme="toggleTheme"
                        @toggle-pin="togglePin"
                        @window-minimize="windowMinimize"
                        @window-close="windowClose"
                    />
                    <GalgameView
                        @back="backToChat"
                        @galgame-effect="handleGalgameEffect"
                    />
                </div>
            </template>

            <div v-else class="flex min-w-0 flex-1 flex-col">
                <TitleBar
                    title="设置"
                    :is-thinking="isThinking"
                    @toggle-theme="toggleTheme"
                    @toggle-pin="togglePin"
                    @window-minimize="windowMinimize"
                    @window-close="windowClose"
                />

                <Settings
                    :theme="theme"
                    @back="backToChat"
                    @set-theme="setTheme"
                    @toggle-pin="togglePin"
                />
            </div>
        </div>
    </div>
</template>
