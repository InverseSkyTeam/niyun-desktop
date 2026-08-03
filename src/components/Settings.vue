<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import Button from "./Button.vue";
import Switch from "./Switch.vue";
import NiyunAvatar from "./NiyunAvatar.vue";
import { css } from "../lib/css";
import { loadAIConfig, saveAIConfig } from "../lib/ai";
import type { AIConfig } from "../lib/types";

defineProps<{
    theme: "light" | "dark";
}>();

const emit = defineEmits<{
    (e: "back"): void;
    (e: "set-theme", t: "light" | "dark"): void;
    (e: "toggle-pin"): void;
}>();

const activeSection = ref<"appearance" | "pet" | "ai" | "about">("appearance");

const sections = [
    { id: "appearance" as const, label: "外观", icon: "sun" },
    { id: "pet" as const, label: "桌宠", icon: "paw" },
    { id: "ai" as const, label: "AI", icon: "sparkles" },
    { id: "about" as const, label: "关于", icon: "info" },
];

const fontSize = ref(14);
const alwaysOnTop = ref(false);
const autoStart = ref(false);
const windowOpacity = ref(100);
const reminderEnabled = ref(
    localStorage.getItem("reminder-enabled") === "true",
);
const reminderInterval = ref(
    Number(localStorage.getItem("reminder-interval")) || 30,
);

const aiConfig = reactive<AIConfig>(loadAIConfig());

function toggleModel(providerIndex: number, modelIndex: number) {
    aiConfig.providers[providerIndex].models[modelIndex].enabled =
        !aiConfig.providers[providerIndex].models[modelIndex].enabled;
}

function saveReminderEnabled(v: boolean) {
    localStorage.setItem("reminder-enabled", String(v));
}

function setReminderInterval(opt: number) {
    reminderInterval.value = opt;
    localStorage.setItem("reminder-interval", String(opt));
}

watch(
    [fontSize, alwaysOnTop, autoStart, windowOpacity],
    () => {
        localStorage.setItem(
            "pet-settings",
            JSON.stringify({
                fontSize: fontSize.value,
                alwaysOnTop: alwaysOnTop.value,
                autoStart: autoStart.value,
                windowOpacity: windowOpacity.value,
            }),
        );
    },
);

watch(
    aiConfig,
    () => {
        saveAIConfig(aiConfig);
    },
    { deep: true },
);
</script>

<template>
    <div class="flex flex-1 overflow-hidden">
        <nav
            class="flex w-60 shrink-0 flex-col border-r border-brand-200/50 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
        >
            <div
                data-tauri-drag-region
                class="flex cursor-default items-center gap-2.5 px-4 py-4"
            >
                <div class="pointer-events-none">
                    <NiyunAvatar :size="32" />
                </div>
                <div class="pointer-events-none min-w-0">
                    <p class="truncate text-sm leading-tight font-semibold">
                        逆云学习版
                    </p>
                </div>
            </div>

            <div class="px-3.5">
                <p
                    class="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-brand-400 uppercase dark:text-brand-400/60"
                >
                    设置
                </p>
            </div>

            <div class="flex-1 scrollbar-thin overflow-y-auto px-2.5">
                <ul class="space-y-0.5">
                    <li v-for="s in sections" :key="s.id">
                        <div
                            class="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition"
                            :class="
                                css(
                                    activeSection === s.id
                                        ? 'bg-gradient-to-r from-brand-500/15 to-brand-700/10 text-brand-700 shadow-soft dark:from-brand-500/20 dark:to-brand-700/10 dark:text-brand-100'
                                        : 'text-brand-700 hover:bg-white/60 dark:text-brand-300 dark:hover:bg-white/5',
                                )
                            "
                            @click="activeSection = s.id"
                        >
                            <svg
                                v-if="s.icon === 'sun'"
                                viewBox="0 0 24 24"
                                class="size-4 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="12" cy="12" r="4" />
                                <path
                                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                                />
                            </svg>
                            <svg
                                v-else-if="s.icon === 'paw'"
                                viewBox="0 0 24 24"
                                class="size-4 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="5.5" cy="11" r="1.5" />
                                <circle cx="9.5" cy="6.5" r="1.5" />
                                <circle cx="14.5" cy="6.5" r="1.5" />
                                <circle cx="18.5" cy="11" r="1.5" />
                                <path
                                    d="M12 12.5c-2.8 0-5 2-5 4.5 0 1.4.9 2.5 2.2 2.5h5.6c1.3 0 2.2-1.1 2.2-2.5 0-2.5-2.2-4.5-5-4.5z"
                                />
                            </svg>
                            <svg
                                v-else-if="s.icon === 'sparkles'"
                                viewBox="0 0 24 24"
                                class="size-4 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 22l-.394-1.433a2.25 2.25 0 0 0-1.673-1.673L13 18.5l1.433-.394a2.25 2.25 0 0 0 1.673-1.673L16.5 15l.394 1.433a2.25 2.25 0 0 0 1.673 1.673L20 18.5l-1.433.394a2.25 2.25 0 0 0-1.673 1.673Z"
                                />
                            </svg>
                            <svg
                                v-else
                                viewBox="0 0 24 24"
                                class="size-4 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4M12 8h.01" />
                            </svg>
                            <span
                                class="truncate text-[13px] leading-tight font-medium"
                                >{{ s.label }}</span
                            >
                        </div>
                    </li>
                </ul>
            </div>

            <div class="border-t border-brand-200/50 p-2.5 dark:border-white/10">
                <Button
                    variant="ghost"
                    block
                    align="start"
                    @click="emit('back')"
                >
                    <svg
                        viewBox="0 0 24 24"
                        class="size-4"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="m12 19-7-7 7-7M19 12H5" />
                    </svg>
                    返回对话
                </Button>
            </div>
        </nav>

        <div class="flex-1 scrollbar-thin overflow-y-auto bg-transparent">
            <div class="mx-auto max-w-lg px-10 py-8">
                <section
                    v-if="activeSection === 'appearance'"
                    class="space-y-6"
                >
                    <div>
                        <h2 class="text-base font-semibold">外观</h2>
                        <p
                            class="mt-0.5 text-xs text-brand-500 dark:text-brand-400"
                        >
                            自定义应用的主题与显示。
                        </p>
                    </div>

                    <div class="space-y-2">
                        <label class="text-[13px] font-medium">主题模式</label>
                        <div class="grid grid-cols-2 gap-2">
                            <Button
                                v-for="opt in [
                                    { v: 'light', l: '亮色' },
                                    { v: 'dark', l: '暗色' },
                                ] as const"
                                :key="opt.v"
                                variant="outline"
                                size="sm"
                                block
                                :active="theme === opt.v"
                                @click="emit('set-theme', opt.v)"
                            >
                                <svg
                                    v-if="opt.v === 'light'"
                                    viewBox="0 0 24 24"
                                    class="size-4"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <circle cx="12" cy="12" r="4" />
                                    <path
                                        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                                    />
                                </svg>
                                <svg
                                    v-else
                                    viewBox="0 0 24 24"
                                    class="size-4"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path
                                        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"
                                    />
                                </svg>
                                {{ opt.l }}
                            </Button>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-[13px] font-medium"
                                >字体大小</label
                            >
                            <span
                                class="font-mono text-xs text-brand-500 dark:text-brand-400"
                                >{{ fontSize }}px</span
                            >
                        </div>
                        <input
                            v-model.number="fontSize"
                            type="range"
                            min="12"
                            max="18"
                            step="1"
                            class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-brand-200/60 accent-brand-900 dark:bg-brand-700 dark:accent-brand-50"
                        />
                        <div
                            class="flex justify-between text-[10px] text-brand-400 dark:text-brand-500"
                        >
                            <span>小</span>
                            <span>默认</span>
                            <span>大</span>
                        </div>
                    </div>
                </section>

                <section v-else-if="activeSection === 'pet'" class="space-y-6">
                    <div>
                        <h2 class="text-base font-semibold">桌宠</h2>
                        <p
                            class="mt-0.5 text-xs text-brand-500 dark:text-brand-400"
                        >
                            窗口与桌宠行为设置。
                        </p>
                    </div>

                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[13px] font-medium">窗口置顶</p>
                            <p
                                class="text-[11px] text-brand-500 dark:text-brand-400"
                            >
                                将窗口保持在最前
                            </p>
                        </div>
                        <Switch
                            v-model="alwaysOnTop"
                            @update:model-value="emit('toggle-pin')"
                        />
                    </div>

                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[13px] font-medium">开机自启</p>
                            <p
                                class="text-[11px] text-brand-500 dark:text-brand-400"
                            >
                                系统登录时自动启动
                            </p>
                        </div>
                        <Switch v-model="autoStart" />
                    </div>

                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-[13px] font-medium">定时提醒</p>
                            <p
                                class="text-[11px] text-brand-500 dark:text-brand-400"
                            >
                                每隔一段时间提醒你休息
                            </p>
                        </div>
                        <Switch
                            v-model="reminderEnabled"
                            @update:model-value="saveReminderEnabled"
                        />
                    </div>

                    <div v-if="reminderEnabled" class="space-y-2">
                        <label class="text-[13px] font-medium">提醒间隔</label>
                        <div class="grid grid-cols-5 gap-2">
                            <Button
                                v-for="opt in [15, 30, 45, 60, 90] as const"
                                :key="opt"
                                variant="outline"
                                size="sm"
                                block
                                :active="reminderInterval === opt"
                                @click="() => setReminderInterval(opt)"
                            >
                                {{ opt }}分
                            </Button>
                        </div>
                    </div>
                </section>

                <section v-else-if="activeSection === 'ai'" class="space-y-6">
                    <div>
                        <h2 class="text-base font-semibold">AI 设置</h2>
                        <p
                            class="mt-0.5 text-xs text-brand-500 dark:text-brand-400"
                        >
                            配置 AI 厂商与模型。
                        </p>
                    </div>

                    <div class="space-y-3">
                        <div
                            v-for="(provider, pi) in aiConfig.providers"
                            :key="provider.id"
                            class="rounded-2xl border border-brand-200/50 bg-white/70 p-3 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5"
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="text-sm font-medium">{{
                                        provider.name
                                    }}</span>
                                    <span
                                        v-if="provider.enabled"
                                        class="rounded bg-brand-200/60 px-1.5 py-0.5 text-[10px] text-brand-600 dark:bg-brand-700 dark:text-brand-300"
                                    >
                                        已启用
                                    </span>
                                </div>
                                <Switch v-model="provider.enabled" />
                            </div>

                            <template v-if="provider.enabled">
                                <div class="mt-3 space-y-2.5">
                                    <div>
                                        <label
                                            class="mb-1 block text-[11px] font-medium text-brand-500 dark:text-brand-400"
                                        >
                                            API Key
                                        </label>
                                        <input
                                            v-model="provider.apiKey"
                                            type="password"
                                            placeholder="sk-..."
                                            class="w-full rounded-lg border border-brand-200/60 bg-white px-2.5 py-1.5 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none dark:border-brand-700 dark:bg-brand-900 dark:text-brand-50 dark:placeholder:text-brand-600 dark:focus:border-brand-500 dark:focus:ring-brand-700"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            class="mb-1 block text-[11px] font-medium text-brand-500 dark:text-brand-400"
                                        >
                                            API URL
                                        </label>
                                        <input
                                            v-model="provider.baseUrl"
                                            type="text"
                                            class="w-full rounded-lg border border-brand-200/60 bg-white px-2.5 py-1.5 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none dark:border-brand-700 dark:bg-brand-900 dark:text-brand-50 dark:placeholder:text-brand-600 dark:focus:border-brand-500 dark:focus:ring-brand-700"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            class="mb-1.5 block text-[11px] font-medium text-brand-500 dark:text-brand-400"
                                        >
                                            模型
                                        </label>
                                        <div class="space-y-1">
                                            <label
                                                v-for="(
                                                    model, mi
                                                ) in provider.models"
                                                :key="model.id"
                                                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-brand-100/60 dark:hover:bg-brand-700/40"
                                            >
                                                <input
                                                    type="checkbox"
                                                    :checked="model.enabled"
                                                    class="size-3.5 accent-brand-900 dark:accent-brand-50"
                                                    @change="
                                                        toggleModel(pi, mi)
                                                    "
                                                />
                                                <span
                                                    class="text-xs text-brand-700 dark:text-brand-300"
                                                >
                                                    {{ model.name }}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </section>

                <section v-else class="space-y-6">
                    <div>
                        <h2 class="text-base font-semibold">关于</h2>
                        <p
                            class="mt-0.5 text-xs text-brand-500 dark:text-brand-400"
                        >
                            应用信息。
                        </p>
                    </div>

                    <div class="flex flex-col items-center py-6 text-center">
                        <div
                            class="flex size-16 items-center justify-center"
                        >
                            <NiyunAvatar :size="72" />
                        </div>
                        <h3 class="mt-3 text-base font-semibold">逆云桌宠 学习版</h3>
                        <p class="text-xs text-brand-500 dark:text-brand-400">
                            可以用来学习的逆云桌宠~
                        </p>
                        <p
                            class="mt-1 font-mono text-[11px] text-brand-400 dark:text-brand-500"
                        >
                            v0.1.0
                        </p>
                    </div>

                    <div
                        class="space-y-2 border-t border-brand-200/40 pt-4 dark:border-brand-700/40"
                    >
                        <div
                            class="flex items-center justify-between text-[13px]"
                        >
                            <span class="text-brand-500 dark:text-brand-400"
                                >许可</span
                            >
                            <span>MIT</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </div>
</template>
