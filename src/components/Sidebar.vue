<script setup lang="ts">
import type { Conversation } from "../lib/types";
import Button from "./Button.vue";
import NiyunAvatar from "./NiyunAvatar.vue";
import { css } from "../lib/css";

defineProps<{
    conversations: Conversation[];
    activeId: string | null;
    isStreaming: (id: string) => boolean;
}>();

const emit = defineEmits<{
    (e: "new-chat"): void;
    (e: "select", id: string): void;
    (e: "delete", id: string): void;
    (e: "open-settings"): void;
    (e: "open-galgame"): void;
}>();
</script>

<template>
    <aside
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
                class="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-brand-400 uppercase dark:text-brand-400/60"
            >
                会话
            </p>
            <ul class="space-y-0.5">
                <li v-for="c in conversations" :key="c.id">
                    <div
                        class="group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition"
                        :class="
                            css(
                                c.id === activeId
                                    ? 'bg-gradient-to-r from-brand-500/15 to-brand-700/10 text-brand-700 shadow-soft dark:from-brand-500/20 dark:to-brand-700/10 dark:text-brand-100'
                                    : 'text-brand-700 hover:bg-white/60 dark:text-brand-300 dark:hover:bg-white/5',
                            )
                        "
                        @click="emit('select', c.id)"
                    >
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5">
                                <span
                                    v-if="isStreaming(c.id)"
                                    class="inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_0_6px_rgba(140,107,230,0.6)]"
                                    aria-label="正在输出"
                                />
                                <p
                                    class="truncate text-[13px] leading-tight font-medium"
                                >
                                    {{ c.title }}
                                </p>
                            </div>
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

        <div class="border-t border-brand-200/50 p-2.5 dark:border-white/10">
            <Button
                variant="ghost"
                block
                align="start"
                @click="emit('open-galgame')"
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
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                视觉小说
            </Button>
            <Button
                variant="ghost"
                block
                align="start"
                @click="emit('open-settings')"
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
