import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { AIProviderConfig, AIConfig } from "./types";

export const aiFetch: typeof fetch =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
        ? tauriFetch
        : window.fetch.bind(window);


export async function createProvider(config: AIProviderConfig) {
    const opts = {
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        fetch: aiFetch,
    };
    switch (config.id) {
        case "deepseek": {
            const { createDeepSeek } = await import("@ai-sdk/deepseek");
            return createDeepSeek(opts);
        }
        case "zhipu": {
            const { createZhipu } = await import("zhipu-ai-provider");
            return createZhipu(opts);
        }
        case "moonshot": {
            const { createMoonshotAI } = await import("@ai-sdk/moonshotai");
            return createMoonshotAI(opts);
        }
        case "openai": {
            const { createOpenAI } = await import("@ai-sdk/openai");
            return createOpenAI(opts);
        }
        case "anthropic": {
            const { createAnthropic } = await import("@ai-sdk/anthropic");
            return createAnthropic(opts);
        }
    }
}


export async function getProvider(activeModel: string, config: AIConfig) {
    const [providerId, modelId] = activeModel.split(":");
    const providerConfig = config.providers.find((p) => p.id === providerId);
    if (!providerConfig) throw new Error(`未找到 AI 厂商: ${providerId}`);
    const provider = await createProvider(providerConfig);
    if (!provider) throw new Error(`不支持的 AI 厂商: ${providerId}`);
    return { provider, modelId };
}
