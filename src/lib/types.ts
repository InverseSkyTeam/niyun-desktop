export type Role = "user" | "assistant" | "system";

export interface ChatMessage {
    id: string;
    role: Role;
    content: string;
    createdAt: number;
    pending?: boolean;
    reasoning?: string;
}

export interface Conversation {
    id: string;
    title: string;
    systemPrompt: string;
    createdAt: number;
    lastActive: number;
}

export type AIProviderId =
    | "deepseek"
    | "zhipu"
    | "moonshot"
    | "openai"
    | "anthropic";

export interface AIModelConfig {
    id: string;
    name: string;
    enabled: boolean;
}

export interface AIProviderConfig {
    id: AIProviderId;
    name: string;
    apiKey: string;
    baseUrl: string;
    enabled: boolean;
    models: AIModelConfig[];
}

export interface AIConfig {
    providers: AIProviderConfig[];
    activeModel: string;
}

export function createDefaultAIConfig(): AIConfig {
    return {
        activeModel: "deepseek:deepseek-chat",
        providers: [
            {
                id: "deepseek",
                name: "Deepseek",
                apiKey: "",
                baseUrl: "https://api.deepseek.com",
                enabled: true,
                models: [
                    {
                        id: "deepseek-chat",
                        name: "Deepseek Chat",
                        enabled: true,
                    },
                    {
                        id: "deepseek-reasoner",
                        name: "Deepseek Reasoner",
                        enabled: false,
                    },
                ],
            },
            {
                id: "zhipu",
                name: "智谱",
                apiKey: "",
                baseUrl: "https://open.bigmodel.cn/api/paas/v4",
                enabled: false,
                models: [
                    { id: "glm-4-plus", name: "GLM-4-Plus", enabled: true },
                    { id: "glm-4-flash", name: "GLM-4-Flash", enabled: false },
                    { id: "glm-4-air", name: "GLM-4-Air", enabled: false },
                ],
            },
            {
                id: "moonshot",
                name: "Kimi (Moonshot)",
                apiKey: "",
                baseUrl: "https://api.moonshot.cn",
                enabled: false,
                models: [
                    {
                        id: "moonshot-v1-8k",
                        name: "moonshot-v1-8k",
                        enabled: true,
                    },
                    {
                        id: "moonshot-v1-32k",
                        name: "moonshot-v1-32k",
                        enabled: false,
                    },
                    {
                        id: "moonshot-v1-128k",
                        name: "moonshot-v1-128k",
                        enabled: false,
                    },
                ],
            },
            {
                id: "openai",
                name: "OpenAI 兼容",
                apiKey: "",
                baseUrl: "https://api.openai.com/v1",
                enabled: false,
                models: [
                    { id: "gpt-4o", name: "gpt-4o", enabled: true },
                    { id: "gpt-4o-mini", name: "gpt-4o-mini", enabled: false },
                ],
            },
            {
                id: "anthropic",
                name: "Anthropic 兼容",
                apiKey: "",
                baseUrl: "https://api.anthropic.com",
                enabled: false,
                models: [
                    {
                        id: "claude-sonnet-4-20250514",
                        name: "claude-sonnet-4",
                        enabled: true,
                    },
                    {
                        id: "claude-haiku-3-5-20241022",
                        name: "claude-haiku-3-5",
                        enabled: false,
                    },
                ],
            },
        ],
    };
}

export interface ToolApprovalRequest {
    id: string;
    toolName: string;
    input: unknown;
    approvalId: string;
}
