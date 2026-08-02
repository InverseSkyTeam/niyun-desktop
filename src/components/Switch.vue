<script setup lang="ts">
import { computed } from "vue";

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
    }
);

const emit = defineEmits<{
    (e: "update:modelValue", v: boolean): void;
}>();

const checked = computed(() => props.modelValue);

function toggle() {
    if (props.disabled) return;
    emit("update:modelValue", !checked.value);
}
</script>

<template>
    <button
        type="button"
        role="switch"
        :aria-checked="checked"
        :disabled="disabled"
        :data-checked="checked ? '' : undefined"
        :data-unchecked="!checked ? '' : undefined"
        :data-size="size"
        :data-disabled="disabled ? '' : undefined"
        :class="[
            'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none',
            'after:absolute after:-inset-x-3 after:-inset-y-2',
            'focus-visible:border-brand-400 focus-visible:ring-3 focus-visible:ring-brand-200/50',
            'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
            'data-[size=default]:h-[18.4px] data-[size=default]:w-[32px]',
            'data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]',
            'data-[checked]:bg-brand-900 dark:data-[checked]:bg-brand-50',
            'data-[unchecked]:bg-brand-300 dark:data-[unchecked]:bg-brand-700',
            props.class,
        ]"
        @click="toggle"
    >
        <span
            data-slot="switch-thumb"
            :class="[
                'pointer-events-none block rounded-full bg-white ring-0 transition-transform shadow',
                'group-data-[size=default]/switch:size-4',
                'group-data-[size=sm]/switch:size-3',
                'group-data-[size=default]/switch:group-data-[checked]/switch:translate-x-[calc(100%-2px)]',
                'group-data-[size=sm]/switch:group-data-[checked]/switch:translate-x-[calc(100%-2px)]',
                'group-data-[size=default]/switch:group-data-[unchecked]/switch:translate-x-0.5',
                'group-data-[size=sm]/switch:group-data-[unchecked]/switch:translate-x-0.5',
            ]"
        />
    </button>
</template>