import {
    streamText,
    type ToolSet,
    type ModelMessage,
    type ToolApprovalResponse,
} from "ai";
import type { AIConfig } from "./types";
import { createDefaultAIConfig } from "./types";
import { StorageKeys, loadJSON, saveJSON } from "./storage";
import { getProvider } from "./providers";

export function loadAIConfig(): AIConfig {
    return loadJSON<AIConfig>(StorageKeys.aiConfig, createDefaultAIConfig());
}

export function saveAIConfig(config: AIConfig): void {
    saveJSON(StorageKeys.aiConfig, config);
}

export async function generateReply(
    prompt: string,
    activeModel: string,
    systemPrompt?: string,
): Promise<string> {
    const { provider, modelId } = await getProvider(activeModel, loadAIConfig());
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

interface StreamRequestOptions {
    system?: string;
    messages: ModelMessage[];
    tools?: ToolSet;
    toolApproval?: Record<string, "user-approval">;
    abortSignal?: AbortSignal;
}


async function createStreamRequest(
    activeModel: string,
    options: StreamRequestOptions,
): Promise<ReturnType<typeof streamText>> {
    const { provider, modelId } = await getProvider(activeModel, loadAIConfig());
    return streamText({ model: provider(modelId), ...options });
}


async function collectTextAndReasoning(
    result: ReturnType<typeof streamText>,
    onChunk?: (chunk: string) => void,
    onReasoning?: (chunk: string) => void,
): Promise<string> {
    let fullText = "";
    for await (const part of result.stream) {
        if (part.type === "text-delta") {
            fullText += part.text;
            onChunk?.(part.text);
        } else if (part.type === "reasoning-delta") {
            onReasoning?.(part.text);
        }
    }
    return fullText;
}

type StreamStep = Awaited<ReturnType<typeof streamText>["steps"]>[number];
type StreamStepPart = StreamStep["content"][number];

function isApprovalPart(
    part: StreamStepPart,
): part is Extract<StreamStepPart, { type: "tool-approval-request" }> {
    return part.type === "tool-approval-request" && !part.isAutomatic;
}


function collectApprovals(steps: StreamStep[]): ApprovalRequest[] {
    return steps
        .flatMap((step) => step.content)
        .filter(isApprovalPart)
        .map((part) => ({
            approvalId: part.approvalId,
            toolName: part.toolCall.toolName,
            input: part.toolCall.input,
        }));
}

function resolveToolCallId(part: StreamStepPart): string | undefined {
    const raw = part as unknown as {
        toolCallId?: string;
        toolCall?: { toolCallId?: string };
    };
    return raw.toolCallId ?? raw.toolCall?.toolCallId;
}


function serializeStepPart(part: StreamStepPart): unknown {
    if (part.type === "tool-approval-request") {
        return {
            type: "tool-approval-request",
            approvalId: part.approvalId,
            toolCallId: resolveToolCallId(part),
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
}

function buildAssistantMessages(steps: StreamStep[]): AIChatMessage[] {
    return steps.map((step) => ({
        role: "assistant",
        content: step.content
            .map(serializeStepPart)
            .filter((p): p is NonNullable<typeof p> => p !== null),
    }));
}

async function collectGenerateResult(
    result: ReturnType<typeof streamText>,
    onChunk?: (chunk: string) => void,
    onReasoning?: (chunk: string) => void,
): Promise<GenerateResult> {
    const fullText = await collectTextAndReasoning(result, onChunk, onReasoning);
    const steps = await result.steps;
    return {
        text: fullText,
        approvals: collectApprovals(steps),
        assistantMessages: buildAssistantMessages(steps),
    };
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
    const result = await createStreamRequest(activeModel, {
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
    const result = await createStreamRequest(activeModel, {
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
