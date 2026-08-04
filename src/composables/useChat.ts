import { ref, reactive, computed, markRaw } from "vue";
import type { ChatMessage, Conversation, ToolApprovalRequest } from "@/lib/types";
import {
    generateWithTools,
    continueWithApprovals,
    type AIChatMessage,
    type GenerateResult,
} from "@/lib/ai";
import type { ToolApprovalResponse, ToolSet } from "ai";
import { allTools, looksLikeProjectRequest, toolApprovalConfig } from "@/lib/tools";
import {
    loadConversations as dbLoadConversations,
    createConversation,
    removeConversation as dbRemoveConversation,
    loadMessages as dbLoadMessages,
    addMessage,
    updateMessage,
    touchConversation,
    getSystemPrompt,
} from "@/lib/db";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/systemPrompt";

const uid = () => Math.random().toString(36).slice(2, 10);

function isAbortError(err: unknown): boolean {
    if (err instanceof DOMException) return err.name === "AbortError";
    return (
        (err as Error)?.name === "AbortError" ||
        (err as Error)?.name === "AI_NoOutputGeneratedError"
    );
}

const REQUEUE_REASON =
    "用户一次只确认一个工具调用。不要继续并行请求，改为在后续步骤中逐个重新发起该请求。";
const MAX_APPROVAL_ROUNDS = 50;

const STOPPED_REFUSAL =
    "哼！话都还没让我说完就喊停，本兽太可不高兴啦！(｀ヘ´) 不说了不说了，下次想听再找我哦～";

interface RunState {
    target: ChatMessage | null;
    history: AIChatMessage[];
    messages: AIChatMessage[];
    systemPrompt: string;
    model: string;
    tools: ToolSet;
    toolApproval: Record<string, "user-approval">;
    approvals: ToolApprovalRequest[];
    resolver: ((approved: boolean) => void) | null;
    stopped: boolean;
}

export interface UseChatOptions {
    getActiveModel: () => string;
    onAssistantReply?: (text: string) => void;
}

export function useChat(options: UseChatOptions) {
    const conversations = ref<Conversation[]>([]);
    const activeId = ref<string | null>(null);
    const allMessages = reactive<Record<string, ChatMessage[]>>({});
    const messages = computed<ChatMessage[]>(() =>
        activeId.value ? (allMessages[activeId.value] ?? []) : [],
    );
    const input = ref("");
    const runStates = reactive<Record<string, RunState>>({});
    const abortControllers = new Map<string, AbortController>();
    const isThinking = computed(() => !!runStates[activeId.value ?? ""]);
    const approvalRequests = computed(
        () => runStates[activeId.value ?? ""]?.approvals.slice(0, 1) ?? [],
    );

    function getConvMessages(id: string): ChatMessage[] {
        if (!allMessages[id]) allMessages[id] = [];
        return allMessages[id];
    }

    async function ensureMessagesLoaded(id: string): Promise<ChatMessage[]> {
        if (!allMessages[id]) {
            allMessages[id] = await dbLoadMessages(id);
        }
        return allMessages[id];
    }

    function isStreaming(id: string): boolean {
        return !!runStates[id];
    }

    function buildMessageHistory(): AIChatMessage[] {
        const convId = activeId.value;
        if (!convId) return [];
        return getConvMessages(convId)
            .filter((m) => m.role !== "system" && !m.pending)
            .map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            }));
    }

    async function initConversations() {
        conversations.value = await dbLoadConversations();
        if (conversations.value.length > 0) {
            const first = conversations.value[0];
            activeId.value = first.id;
            await ensureMessagesLoaded(first.id);
        }
    }

    async function newConversation() {
        const systemPrompt = DEFAULT_SYSTEM_PROMPT;
        const conv: Conversation = {
            id: uid(),
            title: "新对话",
            systemPrompt,
            createdAt: Date.now(),
            lastActive: Date.now(),
        };
        await createConversation(conv.id, conv.title, systemPrompt);
        conversations.value.unshift(conv);
        openConversation(conv.id);
    }

    async function openConversation(id: string) {
        activeId.value = id;
        await ensureMessagesLoaded(id);
        await touchConversation(id);
        const conv = conversations.value.find((c) => c.id === id);
        if (conv) {
            conv.lastActive = Date.now();
        }
    }

    async function removeConversation(id: string) {
        const idx = conversations.value.findIndex((c) => c.id === id);
        if (idx === -1) return;
        const state = runStates[id];
        if (state) {
            state.stopped = true;
            state.approvals = [];
            state.resolver?.(false);
            state.resolver = null;
        }
        delete runStates[id];
        delete allMessages[id];
        conversations.value.splice(idx, 1);
        await dbRemoveConversation(id);
        if (activeId.value === id) {
            activeId.value = conversations.value[0]?.id ?? null;
            if (activeId.value) await ensureMessagesLoaded(activeId.value);
        }
    }

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        if (!activeId.value) {
            await newConversation();
        }
        const convId = activeId.value!;
        if (runStates[convId]) return;

        input.value = "";

        const userMsg: ChatMessage = {
            id: uid(),
            role: "user",
            content: text,
            createdAt: Date.now(),
        };
        getConvMessages(convId).push(userMsg);
        await addMessage(convId, userMsg);

        if (
            getConvMessages(convId).filter((m) => m.role === "user").length ===
            1
        ) {
            const conv = conversations.value.find((c) => c.id === convId);
            if (conv) {
                conv.title = text.slice(0, 18);
                await touchConversation(convId);
            }
        }

        const pendingId = uid();
        const pendingMsg = reactive<ChatMessage>({
            id: pendingId,
            role: "assistant",
            content: "",
            reasoning: "",
            createdAt: Date.now(),
            pending: true,
        });
        getConvMessages(convId).push(pendingMsg);
        await addMessage(convId, pendingMsg);

        const useTools = looksLikeProjectRequest(text);
        const state: RunState = reactive({
            target: pendingMsg,
            history: [],
            messages: [],
            systemPrompt: "",
            model: options.getActiveModel(),
            tools: markRaw(useTools ? allTools : ({} as ToolSet)),
            toolApproval: useTools ? toolApprovalConfig : {},
            approvals: [],
            resolver: null,
            stopped: false,
        });
        runStates[convId] = state;
        abortControllers.set(convId, new AbortController());

        try {
            const systemPrompt = await getSystemPrompt(convId);
            const history = buildMessageHistory();
            state.history = history;
            state.systemPrompt = systemPrompt;

            if (history.length === 0) {
                state.target!.content =
                    "咦？消息历史是空的，我一时不知道该怎么接话……";
                state.target!.pending = false;
                await updateMessage(pendingId, state.target!.content);
                return;
            }

            const result = await generateWithTools(
                history,
                systemPrompt,
                options.getActiveModel(),
                state.tools,
                state.toolApproval,
                (chunk) => {
                    if (!state.target || state.stopped) return;
                    state.target.content += chunk;
                },
                (chunk) => {
                    if (!state.target || state.stopped) return;
                    state.target.reasoning += chunk;
                },
                abortControllers.get(convId)?.signal,
            );

            if (state.stopped) return;

            if (result.approvals.length > 0) {
                state.messages = [...history, ...result.assistantMessages];
                state.approvals = result.approvals.map((a) => ({
                    id: uid(),
                    toolName: a.toolName,
                    input: a.input,
                    approvalId: a.approvalId,
                }));
                void processApprovalQueue(convId);
                return;
            }

            if (state.target) {
                state.target.pending = false;
            }
            await updateMessage(pendingId, result.text || "（完成）");
            options.onAssistantReply?.(result.text);
        } catch (err) {
            const target = state.target;
            const isAbort = isAbortError(err);
            if (target && !state.stopped && !isAbort) {
                target.content = "抱歉，出错了，请稍后重试。";
                target.pending = false;
                await updateMessage(target.id, target.content);
            }
            if (!isAbort) console.error(err);
        } finally {
            if (!runStates[convId]?.resolver) delete runStates[convId];
            abortControllers.delete(convId);
        }
    }

    function waitForUserDecision(state: RunState): Promise<boolean> {
        return new Promise((resolve) => {
            state.resolver = resolve;
        });
    }

    async function processApprovalQueue(convId: string) {
        const state = runStates[convId];
        if (!state) return;
        let rounds = 0;
        try {
            while (state.approvals.length > 0 && rounds < MAX_APPROVAL_ROUNDS) {
                rounds += 1;
                const first = state.approvals[0];
                const rest = state.approvals.slice(1);

                const approved = await waitForUserDecision(state);

                if (state.stopped) return;

                const responses: ToolApprovalResponse[] = [
                    {
                        type: "tool-approval-response",
                        approvalId: first.approvalId,
                        approved,
                        reason: approved
                            ? undefined
                            : "用户明确拒绝了此工具调用，请勿重试，改用其他方式完成目标。",
                    },
                    ...rest.map((r) => ({
                        type: "tool-approval-response" as const,
                        approvalId: r.approvalId,
                        approved: false,
                        reason: REQUEUE_REASON,
                    })),
                ];
                state.approvals = [];

                const result: GenerateResult = await continueWithApprovals(
                    state.messages,
                    state.systemPrompt,
                    state.model,
                    responses,
                    state.tools,
                    state.toolApproval,
                    (chunk) => {
                        if (!state.target || state.stopped) return;
                        state.target.content += chunk;
                    },
                    (chunk) => {
                        if (!state.target || state.stopped) return;
                        state.target.reasoning += chunk;
                    },
                    abortControllers.get(convId)?.signal,
                );

                if (state.stopped) return;

                state.messages = [...state.history, ...result.assistantMessages];
                state.approvals = result.approvals.map((a) => ({
                    id: uid(),
                    toolName: a.toolName,
                    input: a.input,
                    approvalId: a.approvalId,
                }));
            }

            if (state.stopped) return;

            const target = state.target;
            if (target) {
                target.pending = false;
                const text = target.content || "（完成）";
                await updateMessage(target.id, text);
                options.onAssistantReply?.(text);
            }
        } catch (err) {
            const t = state.target;
            const isAbort = isAbortError(err);
            if (t && !state.stopped && !isAbort) {
                if (!t.content) t.content = "抱歉，出错了，请稍后重试。";
                t.pending = false;
                await updateMessage(t.id, t.content);
            }
            if (!isAbort) console.error(err);
        } finally {
            delete runStates[convId];
            abortControllers.delete(convId);
        }
    }

    function handleApprove() {
        const state = runStates[activeId.value ?? ""];
        if (!state) return;
        state.approvals = [];
        state.resolver?.(true);
        state.resolver = null;
    }

    function handleDeny() {
        const state = runStates[activeId.value ?? ""];
        if (!state) return;
        state.approvals = [];
        state.resolver?.(false);
        state.resolver = null;
    }

    async function stopGeneration() {
        const convId = activeId.value ?? "";
        const state = runStates[convId];
        if (state) {
            state.stopped = true;
            try {
                abortControllers.get(convId)?.abort();
            } catch {}
            abortControllers.delete(convId);
            state.approvals = [];
            state.resolver?.(false);
            state.resolver = null;
            delete runStates[convId];
        }
        const arr = messages.value;
        const last = arr[arr.length - 1];
        if (last?.pending) {
            last.pending = false;
            if (!last.content) last.content = STOPPED_REFUSAL;
            await updateMessage(last.id, last.content);
        }
    }

    async function copyMessage(id: string) {
        const m = messages.value.find((x) => x.id === id);
        if (!m) return;
        try {
            await navigator.clipboard.writeText(m.content);
        } catch {}
    }

    return {
        conversations,
        activeId,
        messages,
        input,
        isThinking,
        approvalRequests,
        isStreaming,
        initConversations,
        newConversation,
        openConversation,
        removeConversation,
        sendMessage,
        handleApprove,
        handleDeny,
        stopGeneration,
        copyMessage,
    };
}
