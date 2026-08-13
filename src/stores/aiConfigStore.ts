import { create } from "zustand";
import { loadAIConfig, saveAIConfig } from "@/lib/ai";
import type { AIConfig } from "@/lib/types";

export interface AiModelGroup {
    providerId: string;
    providerName: string;
    models: { id: string; name: string }[];
}

function buildModelGroups(config: AIConfig): AiModelGroup[] {
    return config.providers
        .filter((p) => p.enabled)
        .map((p) => ({
            providerId: p.id,
            providerName: p.name,
            models: p.models
                .filter((m) => m.enabled)
                .map((m) => ({ id: `${p.id}:${m.id}`, name: m.name })),
        }))
        .filter((g) => g.models.length > 0);
}

interface AIConfigState {
    aiConfig: AIConfig;
    activeModel: string;
    aiModelGroups: AiModelGroup[];
    refreshAIConfig: () => void;
    selectModel: (m: string) => void;
    updateConfig: (config: AIConfig) => void;
}

export const useAIConfigStore = create<AIConfigState>((set) => {
    const applyConfig = (config: AIConfig) => {
        saveAIConfig(config);
        set({
            aiConfig: config,
            activeModel: config.activeModel,
            aiModelGroups: buildModelGroups(config),
        });
    };

    return {
        aiConfig: loadAIConfig(),
        activeModel: loadAIConfig().activeModel,
        aiModelGroups: buildModelGroups(loadAIConfig()),

        refreshAIConfig: () => {
            const config = loadAIConfig();
            set({
                aiConfig: config,
                activeModel: config.activeModel,
                aiModelGroups: buildModelGroups(config),
            });
        },

        selectModel: (m) => {
            const config = loadAIConfig();
            config.activeModel = m;
            applyConfig(config);
        },

        updateConfig: applyConfig,
    };
});
