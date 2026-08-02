<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { ChatMessage } from "../types";
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
        props.messages.at(-1)?.content,
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
        class="relative flex-1 scrollbar-thin overflow-y-auto bg-white px-6 py-6 dark:bg-brand-900"
    >
        <div
            v-if="messages.length === 0"
            class="flex h-full flex-col items-center justify-center text-center"
        >
            <h2 class="mt-4 text-lg font-semibold">你好，我是逆云</h2>
            <p class="mt-1 max-w-xs text-sm text-brand-500 dark:text-brand-400">
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
