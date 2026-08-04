import { ref, computed } from "vue";
import { loadAIConfig, saveAIConfig } from "@/lib/ai";
import type { AIConfig } from "@/lib/types";

export function useAIConfig() {
    const aiConfig = ref<AIConfig>(loadAIConfig());
    const activeModel = ref(aiConfig.value.activeModel);

    const aiModelGroups = computed(() => {
        const config = aiConfig.value;
        return config.providers
            .filter((p) => p.enabled)
            .map((p) => ({
                providerId: p.id,
                providerName: p.name,
                models: p.models
                    .filter((m) => m.enabled)
                    .map((m) => ({
                        id: `${p.id}:${m.id}`,
                        name: m.name,
                    })),
            }))
            .filter((g) => g.models.length > 0);
    });

    function selectModel(m: string) {
        activeModel.value = m;
        const config = loadAIConfig();
        config.activeModel = m;
        saveAIConfig(config);
        aiConfig.value = config;
    }

    function refreshAIConfig() {
        aiConfig.value = loadAIConfig();
        activeModel.value = aiConfig.value.activeModel;
    }

    return { aiConfig, activeModel, aiModelGroups, selectModel, refreshAIConfig };
}
