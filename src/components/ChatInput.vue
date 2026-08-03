<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import Button from "./Button.vue";
import { css } from "../lib/css";

export interface AiModelGroup {
    providerId: string;
    providerName: string;
    models: { id: string; name: string }[];
}

const text = defineModel<string>({ default: "" });

const props = defineProps<{
    isThinking: boolean;
    aiModel: string;
    aiModelGroups: AiModelGroup[];
}>();

const emit = defineEmits<{
    (e: "send"): void;
    (e: "stop"): void;
    (e: "select-model", m: string): void;
}>();

const taRef = ref<HTMLTextAreaElement | null>(null);
const menuOpen = ref(false);

const activeModelName = computed(() => {
    for (const g of props.aiModelGroups) {
        const m = g.models.find((m) => m.id === props.aiModel);
        if (m) return m.name;
    }
    return "选择模型";
});

function autoResize() {
    const el = taRef.value;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
}
watch(text, () => nextTick(autoResize));

function onEnter(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
    }
}

function submit() {
    if (!text.value.trim()) return;
    emit("send");
    nextTick(autoResize);
}

function pickModel(m: string) {
    emit("select-model", m);
    menuOpen.value = false;
}
</script>

<template>
    <div class="shrink-0 px-6 py-4">
        <div class="mx-auto max-w-3xl">
            <div
                class="flex flex-col rounded-xl border border-brand-200 bg-brand-50 transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 dark:border-brand-700 dark:bg-brand-800 dark:focus-within:border-brand-500 dark:focus-within:ring-brand-700"
            >
                <textarea
                    ref="taRef"
                    v-model="text"
                    rows="1"
                    placeholder="逆云发消息…  (Enter 发送 / Shift+Enter 换行)"
                    class="max-h-40 w-full resize-none scrollbar-thin bg-transparent px-4 py-3 text-sm text-brand-900 placeholder:text-brand-400 focus:outline-none dark:text-brand-50 dark:placeholder:text-brand-500"
                    @keydown="onEnter"
                />
                <div class="flex items-center justify-between px-3 pb-2.5">
                    <div class="flex items-center gap-0.5">
                        <div class="relative">
                            <button
                                type="button"
                                class="hover:bg-brand-200/60/60 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 transition dark:text-brand-300 dark:hover:bg-brand-700"
                                @click="menuOpen = !menuOpen"
                            >
                                <span class="max-w-[7rem] truncate">{{
                                    activeModelName
                                }}</span>
                                <svg
                                    viewBox="0 0 24 24"
                                    class="size-3 opacity-60"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>

                            <button
                                v-if="menuOpen"
                                type="button"
                                tabindex="-1"
                                aria-hidden="true"
                                class="fixed inset-0 z-40 cursor-default"
                                @click="menuOpen = false"
                            />

                            <Transition
                                enter-active-class="transition duration-120 ease-out"
                                enter-from-class="opacity-0 -translate-y-1"
                                enter-to-class="opacity-100 translate-y-0"
                                leave-active-class="transition duration-100 ease-in"
                                leave-from-class="opacity-100 translate-y-0"
                                leave-to-class="opacity-0 -translate-y-1"
                            >
                                <ul
                                    v-if="menuOpen"
                                    role="listbox"
                                    class="absolute bottom-full left-0 z-50 mb-1.5 flex max-h-60 w-44 scrollbar-thin flex-col gap-0.5 overflow-y-auto rounded-lg border border-brand-200 bg-white p-1 shadow-lg dark:border-brand-700 dark:bg-brand-800"
                                >
                                    <template
                                        v-for="g in aiModelGroups"
                                        :key="g.providerId"
                                    >
                                        <li
                                            class="px-2.5 py-1 text-[10px] font-medium tracking-wider text-brand-400 uppercase dark:text-brand-500"
                                        >
                                            {{ g.providerName }}
                                        </li>
                                        <li v-for="m in g.models" :key="m.id">
                                            <button
                                                type="button"
                                                role="option"
                                                :aria-selected="
                                                    m.id === aiModel
                                                "
                                                class="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition"
                                                :class="
                                                    css(
                                                        m.id === aiModel
                                                            ? 'bg-brand-200/60 font-medium text-black dark:bg-brand-50 dark:text-brand-900'
                                                            : 'text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700',
                                                    )
                                                "
                                                @click="pickModel(m.id)"
                                            >
                                                <span class="truncate">{{
                                                    m.name
                                                }}</span>
                                                <svg
                                                    v-if="m.id === aiModel"
                                                    viewBox="0 0 24 24"
                                                    class="size-3.5 shrink-0"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    stroke-width="2.5"
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                >
                                                    <path d="M20 6 9 17l-5-5" />
                                                </svg>
                                            </button>
                                        </li>
                                    </template>
                                </ul>
                            </Transition>
                        </div>

                        <Button variant="icon" aria-label="添加附件">
                            <svg
                                viewBox="0 0 24 24"
                                class="size-4"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path
                                    d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
                                />
                            </svg>
                        </Button>
                        <Button
                            variant="icon"
                            aria-label="清除输入"
                            @click="text = ''"
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
                                <path
                                    d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                                />
                            </svg>
                        </Button>
                    </div>

                    <Button
                        v-if="isThinking"
                        variant="primary"
                        size="sm"
                        @click="emit('stop')"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            class="size-3.5"
                            fill="currentColor"
                        >
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                        停止
                    </Button>
                    <Button
                        v-else
                        variant="primary"
                        size="sm"
                        :disabled="!text.trim()"
                        @click="submit"
                    >
                        发送
                        <svg
                            viewBox="0 0 24 24"
                            class="size-3.5"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M5 12h14M13 5l7 7-7 7" />
                        </svg>
                    </Button>
                </div>
            </div>
            <p
                class="mt-1.5 text-center text-[10px] text-brand-400 dark:text-brand-500"
            >
                逆云可能出错，重要信息请核实
            </p>
        </div>
    </div>
</template>
