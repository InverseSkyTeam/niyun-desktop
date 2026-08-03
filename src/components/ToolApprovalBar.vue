<script setup lang="ts">
import { computed } from "vue";
import type { ToolApprovalRequest } from "../lib/types";
import { toolDescriptions } from "../lib/tools";
import Button from "./Button.vue";

const props = defineProps<{
    requests: ToolApprovalRequest[];
}>();

const emit = defineEmits<{
    (e: "approve", id: string): void;
    (e: "deny", id: string): void;
    (e: "approve-all"): void;
    (e: "deny-all"): void;
}>();

const isBatch = computed(() => props.requests.length > 1);

function formatInput(input: unknown): string {
    if (typeof input === "string") return input;
    if (typeof input === "object" && input !== null) {
        const obj = input as Record<string, unknown>;
        return Object.entries(obj)
            .map(([k, v]) => {
                const label: Record<string, string> = {
                    path: "路径",
                    command: "命令",
                    content: "内容",
                };
                const val = typeof v === "string" ? v : JSON.stringify(v);
                const maxLen = 120;
                const display =
                    val.length > maxLen ? val.slice(0, maxLen) + "..." : val;
                return `${label[k] || k}: ${display}`;
            })
            .join("\n");
    }
    return JSON.stringify(input);
}
</script>

<template>
    <div class="mx-auto w-full max-w-3xl px-6 py-2">
        <div class="flex items-center justify-between gap-2 px-0.5"></div>
        <div class="mt-2 space-y-2">
            <div
                v-for="req in requests"
                :key="req.id"
                class="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-700 dark:bg-brand-800/50"
            >
                <div class="flex items-center gap-2">
                    <span
                        class="text-sm font-medium text-brand-800 dark:text-brand-100"
                    >
                        {{
                            toolDescriptions[
                                req.toolName as keyof typeof toolDescriptions
                            ] || req.toolName
                        }}
                    </span>
                    <span
                        class="rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] text-brand-500 dark:bg-brand-700 dark:text-brand-400"
                    >
                        {{ req.toolName }}
                    </span>
                    <span class="ml-auto flex shrink-0 gap-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            @click="emit('deny', req.id)"
                        >
                            拒绝
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="xs"
                            @click="emit('approve', req.id)"
                        >
                            批准
                        </Button>
                    </span>
                </div>
                <div
                    v-if="formatInput(req.input) !== ''"
                    class="mt-2 rounded-lg px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-brand-600 dark:bg-brand-900/50 dark:text-brand-400"
                >
                    {{ formatInput(req.input) }}
                </div>
            </div>

            <div v-if="isBatch" class="flex justify-end gap-2 px-0.5">
                <button
                    type="button"
                    class="rounded px-3 py-1.5 text-[11px] font-medium text-brand-500 transition hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-700"
                    @click="emit('deny-all')"
                >
                    全部拒绝
                </button>
                <button
                    type="button"
                    class="rounded bg-brand-900 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-brand-800 dark:bg-brand-50 dark:text-brand-900 dark:hover:bg-brand-200"
                    @click="emit('approve-all')"
                >
                    全部批准
                </button>
            </div>
        </div>
    </div>
</template>
