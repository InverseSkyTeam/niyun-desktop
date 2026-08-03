import {
    streamText,
    type ToolSet,
    type ModelMessage,
    type ToolApprovalResponse,
} from "ai";
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
            return createDeepSeek({
                apiKey: config.apiKey,
                baseURL: config.baseUrl,
            });
        case "zhipu":
            return createZhipu({
                apiKey: config.apiKey,
                baseURL: config.baseUrl,
            });
        case "moonshot":
            return createMoonshotAI({
                apiKey: config.apiKey,
                baseURL: config.baseUrl,
            });
        case "openai":
            return createOpenAI({
                apiKey: config.apiKey,
                baseURL: config.baseUrl,
            });
        case "anthropic":
            return createAnthropic({
                apiKey: config.apiKey,
                baseURL: config.baseUrl,
            });
    }
}

function getProvider(activeModel: string) {
    const config = loadAIConfig();
    const [providerId, modelId] = activeModel.split(":");
    const providerConfig = config.providers.find((p) => p.id === providerId);
    if (!providerConfig) throw new Error(`未找到 AI 厂商: ${providerId}`);
    const provider = createProvider(providerConfig);
    if (!provider) throw new Error(`不支持的 AI 厂商: ${providerId}`);
    return { provider, modelId, systemPrompt: "" };
}

export async function generateReply(
    prompt: string,
    activeModel: string,
    systemPrompt?: string,
): Promise<string> {
    const { provider, modelId } = getProvider(activeModel);
    const result = streamText({
        model: provider(modelId),
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
    });
    return result.text;
}

export interface ApprovalRequest {
    approvalId: string;
    toolName: string;
    input: unknown;
}

export interface GenerateResult {
    text: string;
    approvals: ApprovalRequest[];
    assistantMessages: AIChatMessage[];
}

export type AIChatMessage = {
    role: "user" | "assistant" | "tool";
    content: string | unknown[];
};

async function collectGenerateResult(
    result: ReturnType<typeof streamText>,
    onChunk?: (chunk: string) => void,
    onReasoning?: (chunk: string) => void,
): Promise<GenerateResult> {
    let fullText = "";
    for await (const part of result.stream) {
        if (part.type === "text-delta") {
            fullText += part.text;
            onChunk?.(part.text);
        } else if (part.type === "reasoning-delta") {
            onReasoning?.(part.text);
        }
    }

    const steps = await result.steps;
    const approvals: ApprovalRequest[] = [];

    for (const step of steps) {
        for (const part of step.content) {
            if (part.type === "tool-approval-request" && !part.isAutomatic) {
                approvals.push({
                    approvalId: part.approvalId,
                    toolName: part.toolCall.toolName,
                    input: part.toolCall.input,
                });
            }
        }
    }

    const assistantMessages: AIChatMessage[] = steps.map((step) => ({
        role: "assistant",
        content: step.content
            .map((part) => {
                if (part.type === "tool-approval-request") {
                    const raw = part as unknown as {
                        toolCallId?: string;
                        toolCall?: { toolCallId?: string };
                    };
                    return {
                        type: "tool-approval-request",
                        approvalId: part.approvalId,
                        toolCallId: raw.toolCallId ?? raw.toolCall?.toolCallId,
                    };
                }
                if (part.type === "tool-call") {
                    return {
                        type: "tool-call",
                        toolCallId: part.toolCallId,
                        toolName: part.toolName,
                        input: part.input,
                    };
                }
                if (part.type === "text") {
                    return { type: "text", text: part.text };
                }
                return null;
            })
            .filter((p): p is NonNullable<typeof p> => p !== null) as unknown[],
    }));

    return { text: fullText, approvals, assistantMessages };
}

export async function generateWithTools(
    messages: AIChatMessage[],
    systemPrompt: string,
    activeModel: string,
    tools: ToolSet,
    toolApproval: Record<string, "user-approval">,
    onChunk?: (chunk: string) => void,
    onReasoning?: (chunk: string) => void,
    abortSignal?: AbortSignal,
): Promise<GenerateResult> {
    const { provider, modelId } = getProvider(activeModel);
    const result = streamText({
        model: provider(modelId),
        system: systemPrompt,
        messages: messages as ModelMessage[],
        tools,
        toolApproval,
        abortSignal,
    });

    return collectGenerateResult(result, onChunk, onReasoning);
}

export async function continueWithApprovals(
    messages: AIChatMessage[],
    systemPrompt: string,
    activeModel: string,
    approvalResponses: ToolApprovalResponse[],
    tools: ToolSet,
    toolApproval: Record<string, "user-approval">,
    onChunk?: (chunk: string) => void,
    onReasoning?: (chunk: string) => void,
    abortSignal?: AbortSignal,
): Promise<GenerateResult> {
    const { provider, modelId } = getProvider(activeModel);
    const result = streamText({
        model: provider(modelId),
        system: systemPrompt,
        messages: [
            ...messages,
            { role: "tool", content: approvalResponses },
        ] as ModelMessage[],
        tools,
        toolApproval,
        abortSignal,
    });

    return collectGenerateResult(result, onChunk, onReasoning);
}
