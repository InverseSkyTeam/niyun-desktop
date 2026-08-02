<script setup lang="ts">
import { computed } from "vue";
import type { ChatMessage } from "../types";
import NiyunAvatar from "./NiyunAvatar.vue";

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

interface Segment {
    type: "text" | "code";
    content: string;
    lang?: string;
}
const segments = computed<Segment[]>(() => {
    const raw = props.message.content ?? "";
    const out: Segment[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw)) !== null) {
        if (m.index > last)
            out.push({ type: "text", content: raw.slice(last, m.index) });
        out.push({
            type: "code",
            lang: m[1] || "text",
            content: m[2].replace(/\n$/, ""),
        });
        last = regex.lastIndex;
    }
    if (last < raw.length) out.push({ type: "text", content: raw.slice(last) });
    return out;
});

interface Inline {
    text: string;
    code: boolean;
}
function toInline(text: string): Inline[] {
    const parts = text.split("`");
    return parts.map((t, i) => ({ text: t, code: i % 2 === 1 }));
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

            <div
                v-else
                class="msg-content inline-block rounded-xl px-3.5 py-2.5 text-[13.5px]"
                :class="
                    isUser
                        ? 'bg-brand-900 text-brand-50 dark:bg-brand-50 dark:text-brand-900'
                        : 'bg-brand-100 text-brand-900 dark:bg-brand-800 dark:text-brand-50'
                "
            >
                <template v-for="(seg, i) in segments" :key="i">
                    <div
                        v-if="seg.type === 'code'"
                        class="not-prose my-2 overflow-hidden rounded-lg"
                    >
                        <div
                            class="flex items-center justify-between border-b border-brand-700 bg-brand-800 px-3 py-1.5"
                        >
                            <span
                                class="font-mono text-[10px] tracking-wider text-brand-300 uppercase"
                                >{{ seg.lang }}</span
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
                        ><code>{{ seg.content }}</code></pre>
                    </div>
                    <div v-else class="whitespace-pre-wrap">
                        <template
                            v-for="(part, j) in toInline(seg.content)"
                            :key="j"
                        >
                            <code
                                v-if="part.code"
                                class="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10"
                                >{{ part.text }}</code
                            >
                            <span v-else>{{ part.text }}</span>
                        </template>
                    </div>
                </template>
            </div>

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
