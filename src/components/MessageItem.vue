<script setup lang="ts">
import { computed } from "vue";
import type { ChatMessage } from "../types";
import NiyunAvatar from "./NiyunAvatar.vue";
import { parseMarkdown, renderInlineToHtml } from "../markdown";

const props = defineProps<{ message: ChatMessage }>();
const emit = defineEmits<{
    (e: "regenerate"): void;
    (e: "copy"): void;
}>();

const isUser = computed(() => props.message.role === "user");

const time = computed(() =>
    new Date(props.message.createdAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
    }),
);

const nodes = computed(() => parseMarkdown(props.message.content ?? ""));

function nodeHtml(node: ReturnType<typeof parseMarkdown>[number]): string {
    switch (node.type) {
        case "h1": return `<h1 class="md-h1">${renderInlineToHtml(node.inline)}</h1>`;
        case "h2": return `<h2 class="md-h2">${renderInlineToHtml(node.inline)}</h2>`;
        case "h3": return `<h3 class="md-h3">${renderInlineToHtml(node.inline)}</h3>`;
        case "p": return `<p class="md-p">${renderInlineToHtml(node.inline)}</p>`;
        case "quote": return `<blockquote class="md-quote">${renderInlineToHtml(node.inline)}</blockquote>`;
        case "hr": return `<hr class="md-hr" />`;
        case "ul": return `<ul class="md-ul">${node.items.map((it) => `<li>${renderInlineToHtml(it)}</li>`).join("")}</ul>`;
        case "ol": return `<ol class="md-ol">${node.items.map((it) => `<li>${renderInlineToHtml(it)}</li>`).join("")}</ol>`;
        default: return "";
    }
}
</script>

<template>
    <div
        class="group/msg flex gap-3"
        :class="isUser ? 'flex-row-reverse' : 'flex-row'"
    >
        <NiyunAvatar v-if="!isUser" :size="28" />
        <div
            v-else
            class="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-700"
        >
            <svg
                viewBox="0 0 24 24"
                class="size-4 text-brand-600 dark:text-brand-300"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        </div>

        <div
            class="max-w-[78%] min-w-0"
            :class="isUser ? 'items-end text-right' : 'items-start'"
        >
            <div
                class="mb-1 flex items-center gap-2"
                :class="isUser ? 'flex-row-reverse' : 'flex-row'"
            >
                <span class="text-xs font-semibold">{{
                    isUser ? "你" : "逆云"
                }}</span>
                <span class="text-[10px] text-brand-400 dark:text-brand-500">{{
                    time
                }}</span>
            </div>

            <div
                v-if="message.pending && !message.content"
                class="flex items-center gap-1 rounded-xl bg-brand-100 px-3 py-2.5 dark:bg-brand-800"
            >
                <span class="think-dot size-1.5 rounded-full bg-brand-500" />
                <span class="think-dot size-1.5 rounded-full bg-brand-500" />
                <span class="think-dot size-1.5 rounded-full bg-brand-500" />
            </div>

            <template v-else>
                <div
                    v-if="isUser"
                    class="msg-content inline-block whitespace-pre-wrap rounded-xl bg-brand-900 px-3.5 py-2.5 text-[13.5px] text-brand-50 dark:bg-brand-50 dark:text-brand-900"
                >{{ message.content }}</div>

                <div
                    v-else
                    class="msg-content md-content inline-block rounded-xl bg-brand-100 px-3.5 py-2.5 text-[13.5px] text-brand-900 dark:bg-brand-800 dark:text-brand-50"
                >
                    <template v-for="(node, i) in nodes" :key="i">
                        <div
                            v-if="node.type === 'code'"
                            class="not-prose my-2 overflow-hidden rounded-lg"
                        >
                            <div
                                class="flex items-center justify-between border-b border-brand-700 bg-brand-800 px-3 py-1.5"
                            >
                                <span
                                    class="font-mono text-[10px] tracking-wider text-brand-300 uppercase"
                                    >{{ node.lang }}</span
                                >
                                <button
                                    type="button"
                                    class="text-[10px] text-brand-400 transition hover:text-brand-100"
                                    @click="emit('copy')"
                                >
                                    复制
                                </button>
                            </div>
                            <pre
                                class="scrollbar-thin overflow-x-auto bg-brand-900 p-3 text-[12px] leading-relaxed text-brand-100"
                            ><code>{{ node.content }}</code></pre>
                        </div>

                        <div
                            v-else
                            v-html="nodeHtml(node)"
                        />
                    </template>
                </div>
            </template>

            <div
                v-if="!message.pending"
                class="mt-1 flex gap-1 opacity-0 transition group-hover/msg:opacity-100"
                :class="isUser ? 'justify-end' : 'justify-start'"
            >
                <button
                    type="button"
                    class="rounded p-1 text-brand-400 transition hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-700 dark:hover:text-brand-200"
                    aria-label="复制"
                    @click="emit('copy')"
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
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path
                            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        />
                    </svg>
                </button>
                <button
                    v-if="!isUser"
                    type="button"
                    class="rounded p-1 text-brand-400 transition hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-700 dark:hover:text-brand-200"
                    aria-label="重新生成"
                    @click="emit('regenerate')"
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
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>
