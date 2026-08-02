import { streamText } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import { createZhipu } from "zhipu-ai-provider";
import type { AIProviderConfig, AIConfig } from "./types";
import { createDefaultAIConfig } from "./types";

const STORAGE_KEY = "ai-config";

export function loadAIConfig(): AIConfig {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as AIConfig;
    } catch {}
    return createDefaultAIConfig();
}

export function saveAIConfig(config: AIConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function createProvider(config: AIProviderConfig) {
    switch (config.id) {
        case "deepseek":
            return createDeepSeek({ apiKey: config.apiKey, baseURL: config.baseUrl });
        case "zhipu":
            return createZhipu({ apiKey: config.apiKey, baseURL: config.baseUrl });
        case "moonshot":
            return createMoonshotAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
        case "openai":
            return createOpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl });
        case "anthropic":
            return createAnthropic({ apiKey: config.apiKey, baseURL: config.baseUrl });
    }
}

export async function generateReply(prompt: string, activeModel: string, systemPrompt?: string): Promise<string> {
    const config = loadAIConfig();
    const [providerId, modelId] = activeModel.split(":");
    const providerConfig = config.providers.find((p) => p.id === providerId);
    if (!providerConfig) throw new Error(`未找到 AI 厂商: ${providerId}`);

    const provider = createProvider(providerConfig);
    if (!provider) throw new Error(`不支持的 AI 厂商: ${providerId}`);

    const messages: { role: "user"; content: string }[] = [
        { role: "user", content: prompt },
    ];

    const result = streamText({
        model: provider(modelId),
        system: systemPrompt,
        messages,
    });

    return result.text;
}