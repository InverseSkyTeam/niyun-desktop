<script setup lang="ts">
import type { Conversation } from "../types";
import Button from "./Button.vue";
import NiyunAvatar from "./NiyunAvatar.vue";

defineProps<{
    conversations: Conversation[];
    activeId: string | null;
}>();

const emit = defineEmits<{
    (e: "new-chat"): void;
    (e: "select", id: string): void;
    (e: "delete", id: string): void;
    (e: "open-settings"): void;
}>();

function relTime(ts: number): string {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "刚刚";
    if (min < 60) return `${min} 分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} 小时前`;
    return `${Math.floor(hr / 24)} 天前`;
}
</script>

<template>
    <aside
        class="flex w-60 shrink-0 flex-col border-r border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-800"
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
                    逆云桌宠 学习版
                </p>
            </div>
        </div>

        <div class="px-3.5">
            <Button variant="outline" block @click="emit('new-chat')">
                <svg
                    viewBox="0 0 24 24"
                    class="size-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                >
                    <path d="M12 5v14M5 12h14" />
                </svg>
                新建对话
            </Button>
        </div>

        <div class="mt-3 flex-1 scrollbar-thin overflow-y-auto px-2.5">
            <p
                class="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-brand-400 uppercase dark:text-brand-500"
            >
                会话
            </p>
            <ul class="space-y-0.5">
                <li v-for="c in conversations" :key="c.id">
                    <div
                        class="group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 transition"
                        :class="
                            c.id === activeId
                                ? 'bg-brand-200/60 text-black dark:bg-brand-50 dark:text-brand-900'
                                : 'text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700'
                        "
                        @click="emit('select', c.id)"
                    >
                        <div class="min-w-0 flex-1">
                            <p
                                class="truncate text-[13px] leading-tight font-medium"
                            >
                                {{ c.title }}
                            </p>
                            </div>

                        <button
                            type="button"
                            class="shrink-0 rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                            :aria-label="'删除会话 ' + c.title"
                            @click.stop="emit('delete', c.id)"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                class="size-3.5"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                                />
                            </svg>
                        </button>
                    </div>
                </li>
            </ul>
        </div>

        <div
            class="border-t border-brand-200/40 p-2.5 dark:border-brand-700/40"
        >
            <Button variant="ghost" block @click="emit('open-settings')" align="start">
                <svg
                    viewBox="0 0 24 24"
                    class="size-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <circle cx="12" cy="12" r="3" />
                    <path
                        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                    />
                </svg>
                设置
            </Button>
        </div>
    </aside>
</template>
