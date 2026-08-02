<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
    defineProps<{
        variant?: "primary" | "outline" | "ghost" | "icon" | "chip";
        size?: "xs" | "sm" | "md";
        active?: boolean;
        danger?: boolean;
        disabled?: boolean;
        block?: boolean;
        align?: "start" | "center";
    }>(),
    {
        variant: "ghost",
        size: "md",
        active: false,
        danger: false,
        disabled: false,
        block: false,
        align: "center",
    },
);

defineEmits<{
    (e: "click", ev: MouseEvent): void;
}>();

const base =
    "inline-flex items-center gap-1.5 rounded-lg font-medium transition active:scale-[0.98] focus:outline-none disabled:opacity-40 disabled:pointer-events-none";

const alignClass = computed(() =>
    props.align === "start" ? "justify-start" : "justify-center",
);

const sizeClass = computed(() => {
    if (props.variant === "icon") return "size-8 shrink-0";
    switch (props.size) {
        case "xs":
            return "px-2.5 py-2 text-xs";
        case "sm":
            return "px-3 py-2 text-xs";
        case "md":
        default:
            return "px-3.5 py-2.5 text-sm";
    }
});

const variantClass = computed(() => {
    switch (props.variant) {
        case "primary":
            return "bg-brand-900 text-brand-50 hover:brightness-110 dark:bg-brand-50 dark:text-brand-900";
        case "outline":
            return props.active
                ? "border border-brand-900 bg-brand-900 text-brand-50 dark:border-brand-50 dark:bg-brand-50 dark:text-brand-900"
                : "border border-brand-200 bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:bg-brand-900 dark:text-brand-200 dark:hover:border-brand-600 dark:hover:bg-brand-700";
        case "chip":
            return "rounded-full border border-brand-200 text-brand-600 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-800";
        case "icon":
            return props.danger
                ? "text-brand-500 hover:bg-red-500 hover:text-white dark:text-brand-400"
                : "text-brand-500 hover:bg-brand-100 dark:text-brand-400 dark:hover:bg-brand-800";
        case "ghost":
        default:
            return props.active
                ? "bg-brand-900 text-brand-50 dark:bg-brand-50 dark:text-brand-900"
                : "text-brand-600 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700";
    }
});

const classes = computed(() => [
    base,
    alignClass.value,
    sizeClass.value,
    variantClass.value,
    props.block && "w-full",
]);
</script>

<template>
    <button
        type="button"
        :disabled="disabled"
        :class="classes"
        @click="$emit('click', $event)"
    >
        <slot />
    </button>
</template>
