<script setup lang="ts">
import { computed } from "vue";
import { css } from "../lib/css";

const props = withDefaults(
    defineProps<{
        modelValue?: boolean;
        size?: "sm" | "default";
        disabled?: boolean;
        class?: string;
    }>(),
    {
        modelValue: false,
        size: "default",
        disabled: false,
        class: "",
    },
);

const emit = defineEmits<{
    (e: "update:modelValue", v: boolean): void;
}>();

const checked = computed(() => props.modelValue);

function toggle() {
    if (!props.disabled) emit("update:modelValue", !checked.value);
}
</script>

<template>
    <button
        type="button"
        role="switch"
        :aria-checked="checked"
        :disabled="disabled"
        :data-checked="checked ? '' : undefined"
        :data-size="size"
        :class="[
            'peer relative inline-flex shrink-0 items-center rounded-full transition-all outline-none',
            css(
                checked
                    ? 'bg-gradient-to-r from-brand-600 to-brand-800 shadow-glow'
                    : 'bg-brand-200 dark:bg-white/15',
            ),
            css(
                checked
                    ? 'data-[size=default]:h-5 data-[size=default]:w-9'
                    : '',
            ),
            css(checked ? 'data-[size=sm]:h-4 data-[size=sm]:w-7' : ''),
            css(size === 'default' ? 'h-5 w-9' : 'h-4 w-7'),
            'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
            'focus-visible:ring-3 focus-visible:ring-brand-300/50',
            props.class,
        ]"
        @click="toggle"
    >
        <span
            class="pointer-events-none block rounded-full bg-white shadow-sm transition-transform"
            :class="[
                css(size === 'default' ? 'size-4' : 'size-3'),
                css(
                    checked
                        ? size === 'default'
                            ? 'translate-x-4'
                            : 'translate-x-3'
                        : 'translate-x-0.5',
                ),
            ]"
        />
    </button>
</template>
