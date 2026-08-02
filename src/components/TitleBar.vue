<script setup lang="ts">
import Button from "./Button.vue";

defineProps<{
    title: string;
    isThinking: boolean;
}>();

const emit = defineEmits<{
    (e: "toggle-theme"): void;
    (e: "toggle-pin"): void;
    (e: "window-minimize"): void;
    (e: "window-close"): void;
}>();
</script>

<template>
    <header
        data-tauri-drag-region
        class="relative z-30 flex h-12 shrink-0 items-center gap-2.5 border-b border-brand-200/40 bg-white/80 px-4 backdrop-blur dark:border-brand-700/40 dark:bg-brand-900/80"
    >
        <h1 class="pointer-events-none truncate text-sm font-semibold">
            {{ title }}
        </h1>

        <div class="flex-1" />

        <Button
            variant="icon"
            aria-label="切换主题"
            @click="emit('toggle-theme')"
        >
            <svg
                viewBox="0 0 24 24"
                class="size-4 dark:hidden"
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
                viewBox="0 0 24 24"
                class="hidden size-4 dark:block"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
            </svg>
        </Button>

        <Button
            variant="icon"
            aria-label="窗口置顶"
            @click="emit('toggle-pin')"
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
                    d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
                />
            </svg>
        </Button>

        <div class="mx-1.5 h-5 w-px bg-brand-200/40 dark:bg-brand-700/40" />

        <Button
            variant="icon"
            aria-label="最小化"
            @click="emit('window-minimize')"
        >
            <svg
                viewBox="0 0 24 24"
                class="size-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
            >
                <path d="M5 12h14" />
            </svg>
        </Button>
        <Button
            variant="icon"
            danger
            aria-label="关闭"
            @click="emit('window-close')"
        >
            <svg
                viewBox="0 0 24 24"
                class="size-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
            >
                <path d="M18 6 6 18M6 6l12 12" />
            </svg>
        </Button>
    </header>
</template>
