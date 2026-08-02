<script setup lang="ts">
withDefaults(
    defineProps<{
        size?: number;
    }>(),
    { size: 32 },
);
</script>

<template>
    <div
        class="flex shrink-0 items-center justify-center rounded-full bg-white dark:bg-brand-50"
        :style="{ width: size + 'px', height: size + 'px' }"
    >
        <img
            src="/niyun.png"
            alt="逆云"
            class="h-full w-full rounded-full object-cover"
        />
    </div>
</template>
