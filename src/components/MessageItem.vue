<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { ChatMessage } from "../lib/types";
import NiyunAvatar from "./NiyunAvatar.vue";
import { parseMarkdown, renderInlineToHtml } from "../lib/markdown";
import { css } from "../lib/css";

const props = defineProps<{ message: ChatMessage }>();
const emit = defineEmits<{
    (e: "regenerate"): void;
    (e: "copy"): void;
}>();

const isUser = computed(() => props.message.role === "user");

const reasoningOpen = ref(false);

const reasoningBodyEl = ref<HTMLElement | null>(null);
watch(
    () => props.message.reasoning,
    () => {
        const el = reasoningBodyEl.value;
        if (el) el.scrollTop = el.scrollHeight;
    },
    { flush: "post" },
);

const time = computed(() =>
    new Date(props.message.createdAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
    }),
);

const nodes = computed(() => parseMarkdown(props.message.content ?? ""));

function nodeHtml(node: ReturnType<typeof parseMarkdown>[number]): string {
    switch (node.type) {
        case "h1":
            return `<h1 class="md-h1">${renderInlineToHtml(node.inline)}</h1>`;
        case "h2":
            return `<h2 class="md-h2">${renderInlineToHtml(node.inline)}</h2>`;
        case "h3":
            return `<h3 class="md-h3">${renderInlineToHtml(node.inline)}</h3>`;
        case "p":
            return `<p class="md-p">${renderInlineToHtml(node.inline)}</p>`;
        case "quote":
            return `<blockquote class="md-quote">${renderInlineToHtml(node.inline)}</blockquote>`;
        case "hr":
            return `<hr class="md-hr" />`;
        case "ul":
            return `<ul class="md-ul">${node.items.map((it) => `<li>${renderInlineToHtml(it)}</li>`).join("")}</ul>`;
        case "ol":
            return `<ol class="md-ol">${node.items.map((it) => `<li>${renderInlineToHtml(it)}</li>`).join("")}</ol>`;
        default:
            return "";
    }
}

const icon =
    "size-3.5 fill-none stroke-current stroke-2 stroke-linecap-round stroke-linejoin-round";
</script>

<template>
    <div
        class="group/msg flex gap-3"
        :class="css(isUser ? 'flex-row-reverse' : 'flex-row')"
    >
        <NiyunAvatar v-if="!isUser" :size="28" />
        <div
            v-else
            class="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-brand-700/20"
        >
            <svg
                viewBox="0 0 24 24"
                class="size-4 text-brand-500"
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
            :class="css(isUser ? 'items-end text-right' : 'items-start')"
        >
            <div
                class="mb-1 flex items-center gap-2"
                :class="css(isUser ? 'flex-row-reverse' : 'flex-row')"
            >
                <span class="text-xs font-semibold">{{
                    isUser ? "你" : "逆云"
                }}</span>
                <span class="text-[10px] text-brand-400/70">{{ time }}</span>
            </div>

            <div
                v-if="!isUser && message.reasoning"
                class="mb-1.5 overflow-hidden rounded-2xl border border-brand-200/50 bg-white/70 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5"
            >
                <button
                    type="button"
                    class="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[11px] font-medium text-brand-500 transition hover:bg-brand-100/60 hover:text-brand-700 dark:text-brand-300 dark:hover:bg-white/5 dark:hover:text-brand-100"
                    @click="reasoningOpen = !reasoningOpen"
                >
                    <svg
                        viewBox="0 0 24 24"
                        class="size-3"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    思考过程
                    <svg
                        viewBox="0 0 24 24"
                        class="ml-auto size-3 transition-transform duration-200"
                        :class="
                            reasoningOpen || message.pending
                                ? 'rotate-180'
                                : ''
                        "
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </button>
                <div
                    v-if="reasoningOpen || message.pending"
                    ref="reasoningBodyEl"
                    class="reasoning-text scrollbar-thin max-h-40 overflow-y-auto px-3 pb-2.5 text-[11.5px] leading-relaxed whitespace-pre-wrap text-brand-900/70 dark:text-brand-100/70"
                >
                    {{ message.reasoning }}
                </div>
            </div>

            <div
                v-if="message.pending && !message.content"
                class="flex items-center gap-1 rounded-2xl border border-brand-200/50 bg-white/60 px-4 py-3 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5"
            >
                <span class="think-dot size-1.5 rounded-full bg-brand-400" />
                <span class="think-dot size-1.5 rounded-full bg-brand-400" />
                <span class="think-dot size-1.5 rounded-full bg-brand-400" />
            </div>

            <template v-else>
                <div
                    v-if="isUser"
                    class="msg-content inline-block rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap text-white shadow-glow dark:from-brand-700 dark:to-brand-900"
                >
                    {{ message.content }}
                </div>

                <div
                    v-else
                    class="msg-content md-content inline-block rounded-2xl border border-brand-200/50 bg-white/70 px-3.5 py-2.5 text-[13.5px] text-brand-900 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-brand-50"
                >
                    <template v-for="(node, i) in nodes" :key="i">
                        <div
                            v-if="node.type === 'code'"
                            class="not-prose my-2 overflow-hidden rounded-xl"
                        >
                            <div
                                class="flex items-center justify-between border-b border-white/10 bg-ink/80 px-3 py-1.5"
                            >
                                <span
                                    class="font-mono text-[10px] tracking-wider text-brand-300 uppercase"
                                    >{{ node.lang }}</span
                                >
                                <button
                                    type="button"
                                    class="text-[10px] text-brand-400 transition hover:text-white"
                                    @click="emit('copy')"
                                >
                                    复制
                                </button>
                            </div>
                            <pre
                                class="scrollbar-thin overflow-x-auto bg-ink/80 p-3 text-[12px] leading-relaxed text-brand-100"
                            ><code>{{ node.content }}</code></pre>
                        </div>

                        <div v-else v-html="nodeHtml(node)" />
                    </template>
                </div>
            </template>

            <div
                v-if="!message.pending"
                class="mt-1 flex gap-1 opacity-0 transition group-hover/msg:opacity-100"
                :class="css(isUser ? 'justify-end' : 'justify-start')"
            >
                <button
                    type="button"
                    class="rounded p-1 text-brand-400/70 transition hover:bg-white/60 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="复制"
                    @click="emit('copy')"
                >
                    <svg viewBox="0 0 24 24" :class="icon">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path
                            d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        />
                    </svg>
                </button>
                <button
                    v-if="!isUser"
                    type="button"
                    class="rounded p-1 text-brand-400/70 transition hover:bg-white/60 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="重新生成"
                    @click="emit('regenerate')"
                >
                    <svg viewBox="0 0 24 24" :class="icon">
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                        <path d="M3 3v5h5" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
</template>
