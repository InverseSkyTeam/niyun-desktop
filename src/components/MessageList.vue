<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { ChatMessage } from "../lib/types";
import Button from "./Button.vue";
import MessageItem from "./MessageItem.vue";

const props = defineProps<{
    messages: ChatMessage[];
    isThinking: boolean;
}>();

const emit = defineEmits<{
    (e: "regenerate", id: string): void;
    (e: "copy", id: string): void;
    (e: "suggestion", text: string): void;
}>();

const scrollRef = ref<HTMLDivElement | null>(null);

function scrollToBottom() {
    const el = scrollRef.value;
    if (el) el.scrollTop = el.scrollHeight;
}
watch(
    () => [
        props.messages.length,
        props.isThinking,
        props.messages[props.messages.length - 1]?.content,
        props.messages[props.messages.length - 1]?.reasoning,
    ],
    () => nextTick(scrollToBottom),
    { flush: "post" },
);

const suggestions = [
    "介绍你自己",
    "写一个快排算法",
    "帮我润色一段文字",
    "解释闭包",
];
</script>

<template>
    <div
        ref="scrollRef"
        class="relative flex-1 scrollbar-thin overflow-y-auto px-6 pt-6 pb-2"
    >
        <div
            v-if="messages.length === 0"
            class="flex h-full flex-col items-center justify-center text-center"
        >
            <div
                class="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-brand-700/10 shadow-soft"
            >
                <svg
                    viewBox="0 0 24 24"
                    class="size-7 text-brand-500"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path
                        d="M12 2v8M12 2a10 10 0 1 0 10 10h-10z"
                        transform="translate(0 2)"
                    />
                    <path d="M12 12l8-2M12 12l-4 6" />
                </svg>
            </div>
            <h2 class="mt-4 text-lg font-semibold">你好，我是逆云</h2>
            <p
                class="mt-1 max-w-xs text-sm text-brand-400 dark:text-brand-400/60"
            >
                有什么可以帮你的？输入消息或选择下方建议开始对话。
            </p>
            <div class="mt-5 flex flex-wrap justify-center gap-2">
                <Button
                    v-for="s in suggestions"
                    :key="s"
                    variant="chip"
                    size="sm"
                    @click="emit('suggestion', s)"
                >
                    {{ s }}
                </Button>
            </div>
        </div>

        <div v-else class="mx-auto flex max-w-3xl flex-col gap-6">
            <MessageItem
                v-for="m in messages"
                :key="m.id"
                :message="m"
                @regenerate="emit('regenerate', m.id)"
                @copy="emit('copy', m.id)"
            />
        </div>
    </div>
</template>
