import type { ToolSet } from "ai";
import type { ChatMessage, ToolApprovalRequest } from "@/lib/types";
import {
    generateWithTools,
    continueWithApprovals,
    type AIChatMessage,
    type ApprovalRequest,
    type GenerateResult,
} from "@/lib/ai";
import { buildApprovalResponses } from "@/lib/approval";
import { allTools, toolApprovalConfig } from "@/lib/tools";
import { updateMessage, getSystemPrompt } from "@/lib/db";
import { useAIConfigStore } from "./aiConfigStore";
import type { ChatState } from "./chatStore";

const uid = () => Math.random().toString(36).slice(2, 10);

function isAbortError(err: unknown): boolean {
    if (err instanceof DOMException) return err.name === "AbortError";
    return (
        (err as Error)?.name === "AbortError" ||
        (err as Error)?.name === "AI_NoOutputGeneratedError"
    );
}

const MAX_APPROVAL_ROUNDS = 50;
const STOPPED_REFUSAL =
    "哼！话都还没让我说完就喊停，本兽太可不高兴啦！(｀ヘ´) 不说了不说了，下次想听再找我哦～";
const ERROR_TEXT = "抱歉，出错了，请稍后重试。";

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

interface StoreHandle {
    getState: () => ChatState;
    setState: (partial: Partial<ChatState>) => void;
}

interface RunnerShared {
    store: StoreHandle;
    runStates: Map<string, RunState>;
    abortControllers: Map<string, AbortController>;
}

export interface ChatRunner {
    isStreaming: (convId: string) => boolean;
    startGeneration: (
        convId: string,
        pendingMsg: ChatMessage,
        useTools: boolean,
    ) => Promise<void>;
    approveCurrent: (convId: string) => void;
    denyCurrent: (convId: string) => void;
    stopGeneration: (convId: string) => Promise<void>;
    cleanupConversation: (convId: string) => void;
}


function getMessages(store: StoreHandle, convId: string): ChatMessage[] {
    return store.getState().messagesByConversation[convId] ?? [];
}

function patchMessage(
    store: StoreHandle,
    convId: string,
    msgId: string,
    patch: Partial<ChatMessage>,
) {
    const { messagesByConversation } = store.getState();
    const arr = messagesByConversation[convId];
    if (!arr) return;
    store.setState({
        messagesByConversation: {
            ...messagesByConversation,
            [convId]: arr.map((m) =>
                m.id === msgId ? { ...m, ...patch } : m,
            ),
        },
    });
}

function currentMessage(
    store: StoreHandle,
    convId: string,
    msgId: string,
): ChatMessage | undefined {
    return getMessages(store, convId).find((m) => m.id === msgId);
}


function appendChunk(shared: RunnerShared, convId: string, msgId: string, chunk: string) {
    const state = shared.runStates.get(convId);
    if (!state?.target || state.stopped) return;
    state.target.content = (state.target.content ?? "") + chunk;
    patchMessage(shared.store, convId, msgId, { content: state.target.content });
}

function appendReasoning(shared: RunnerShared, convId: string, msgId: string, chunk: string) {
    const state = shared.runStates.get(convId);
    if (!state?.target || state.stopped) return;
    state.target.reasoning = (state.target.reasoning ?? "") + chunk;
    patchMessage(shared.store, convId, msgId, { reasoning: state.target.reasoning });
}


function mapApprovalRequests(approvals: ApprovalRequest[]): ToolApprovalRequest[] {
    return approvals.map((a) => ({
        id: uid(),
        toolName: a.toolName,
        input: a.input,
        approvalId: a.approvalId,
    }));
}

function clearApprovalRequests(store: StoreHandle, convId: string) {
    if (store.getState().activeId === convId) {
        store.setState({ approvalRequests: [] });
    }
}

function waitForUserDecision(state: RunState): Promise<boolean> {
    return new Promise((resolve) => {
        state.resolver = resolve;
    });
}

function setRunActive(shared: RunnerShared, convId: string, active: boolean) {
    const s = shared.store.getState();
    const activeConvId = s.activeId ?? "";
    const activeState = shared.runStates.get(activeConvId);
    shared.store.setState({
        isThinking: shared.runStates.has(activeConvId),
        approvalRequests:
            active && activeConvId !== convId
                ? s.approvalRequests
                : (activeState?.approvals.slice(0, 1) ?? []),
        streamingIds: active
            ? [...new Set([...s.streamingIds, convId])]
            : s.streamingIds.filter((id) => id !== convId),
    });
}

function endRun(shared: RunnerShared, convId: string) {
    if (!shared.runStates.get(convId)?.resolver) {
        shared.runStates.delete(convId);
        setRunActive(shared, convId, false);
    }
    shared.abortControllers.delete(convId);
}


async function finishMessage(shared: RunnerShared, convId: string, msgId: string, text: string) {
    patchMessage(shared.store, convId, msgId, { pending: false });
    await updateMessage(msgId, text);
    shared.store.getState().onAssistantReply?.(text);
}


async function failMessage(shared: RunnerShared, convId: string, msgId: string, text: string) {
    patchMessage(shared.store, convId, msgId, { content: text, pending: false });
    await updateMessage(msgId, text);
}

function buildHistoryMessages(msgs: ChatMessage[]): AIChatMessage[] {
    return msgs
        .filter((m) => m.role !== "system" && !m.pending)
        .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        }));
}

function createInitialState(
    pendingMsg: ChatMessage,
    useTools: boolean,
): RunState {
    return {
        target: pendingMsg,
        history: [],
        messages: [],
        systemPrompt: "",
        model: useAIConfigStore.getState().activeModel,
        tools: useTools ? allTools : ({} as ToolSet),
        toolApproval: useTools ? toolApprovalConfig : {},
        approvals: [],
        resolver: null,
        stopped: false,
    };
}


async function settlePendingMessage(shared: RunnerShared, convId: string) {
    const messages = getMessages(shared.store, convId);
    const last = messages[messages.length - 1];
    if (!last?.pending) return;
    const content = last.content || STOPPED_REFUSAL;
    patchMessage(shared.store, convId, last.id, { pending: false, content });
    await updateMessage(last.id, content);
}



class ApprovalRunner {
    constructor(private shared: RunnerShared) {}

    
    async run(convId: string) {
        const state = this.shared.runStates.get(convId);
        if (!state) return;
        try {
            await this.runLoop(convId, state);
            await this.settle(convId, state);
        } catch (err) {
            await this.handleError(convId, state, err);
        } finally {
            endRun(this.shared, convId);
        }
    }

    
    resolve(convId: string, approved: boolean) {
        const state = this.shared.runStates.get(convId);
        if (!state) return;
        state.approvals = [];
        state.resolver?.(approved);
        state.resolver = null;
        clearApprovalRequests(this.shared.store, convId);
    }

    private async runLoop(convId: string, state: RunState) {
        for (let rounds = 0; rounds < MAX_APPROVAL_ROUNDS; rounds++) {
            if (state.approvals.length === 0) return;
            await this.runRound(convId, state);
        }
    }

    private async runRound(convId: string, state: RunState) {
        const first = state.approvals[0];
        const rest = state.approvals.slice(1);

        const approved = await waitForUserDecision(state);
        if (state.stopped) return;

        const responses = buildApprovalResponses(
            first.approvalId,
            rest.map((r) => r.approvalId),
            approved,
        );
        state.approvals = [];
        clearApprovalRequests(this.shared.store, convId);

        const result: GenerateResult = await continueWithApprovals(
            state.messages,
            state.systemPrompt,
            state.model,
            responses,
            state.tools,
            state.toolApproval,
            (chunk) =>
                appendChunk(this.shared, convId, state.target?.id ?? "", chunk),
            (chunk) =>
                appendReasoning(
                    this.shared,
                    convId,
                    state.target?.id ?? "",
                    chunk,
                ),
            this.shared.abortControllers.get(convId)?.signal,
        );

        if (state.stopped) return;

        state.messages = [...state.history, ...result.assistantMessages];
        state.approvals = mapApprovalRequests(result.approvals);
        setRunActive(this.shared, convId, true);
    }

    private async settle(convId: string, state: RunState) {
        if (state.stopped) return;
        const target = state.target;
        if (!target) return;
        await finishMessage(
            this.shared,
            convId,
            target.id,
            target.content || "（完成）",
        );
    }

    private async handleError(
        convId: string,
        state: RunState,
        err: unknown,
    ) {
        const target = state.target;
        const isAbort = isAbortError(err);
        if (target && !state.stopped && !isAbort) {
            const content =
                currentMessage(this.shared.store, convId, target.id)?.content ||
                ERROR_TEXT;
            patchMessage(this.shared.store, convId, target.id, {
                content,
                pending: false,
            });
            await updateMessage(target.id, content);
        }
        if (!isAbort) console.error(err);
    }
}



class ChatRunnerEngine {
    private shared: RunnerShared;
    private approvals: ApprovalRunner;

    constructor(store: StoreHandle) {
        this.shared = {
            store,
            runStates: new Map(),
            abortControllers: new Map(),
        };
        this.approvals = new ApprovalRunner(this.shared);
    }


    async startGeneration(
        convId: string,
        pendingMsg: ChatMessage,
        useTools: boolean,
    ) {
        const state = createInitialState(pendingMsg, useTools);
        this.shared.runStates.set(convId, state);
        this.shared.abortControllers.set(convId, new AbortController());
        setRunActive(this.shared, convId, true);

        try {
            await this.runInitialGeneration(convId, pendingMsg, state);
        } catch (err) {
            await this.handleGenerationError(convId, pendingMsg, state, err);
        } finally {
            endRun(this.shared, convId);
        }
    }

    private async runInitialGeneration(
        convId: string,
        pendingMsg: ChatMessage,
        state: RunState,
    ) {
        state.systemPrompt = await getSystemPrompt(convId);
        state.history = buildHistoryMessages(getMessages(this.shared.store, convId));

        const result = await generateWithTools(
            state.history,
            state.systemPrompt,
            state.model,
            state.tools,
            state.toolApproval,
            (chunk) => appendChunk(this.shared, convId, pendingMsg.id, chunk),
            (chunk) =>
                appendReasoning(this.shared, convId, pendingMsg.id, chunk),
            this.shared.abortControllers.get(convId)?.signal,
        );

        if (state.stopped) return;

        if (result.approvals.length > 0) {
            state.messages = [...state.history, ...result.assistantMessages];
            state.approvals = mapApprovalRequests(result.approvals);
            setRunActive(this.shared, convId, true);
            void this.approvals.run(convId);
            return;
        }

        await finishMessage(
            this.shared,
            convId,
            pendingMsg.id,
            result.text || "（完成）",
        );
    }

    private async handleGenerationError(
        convId: string,
        pendingMsg: ChatMessage,
        state: RunState,
        err: unknown,
    ) {
        const isAbort = isAbortError(err);
        if (!state.stopped && !isAbort) {
            await failMessage(this.shared, convId, pendingMsg.id, ERROR_TEXT);
        }
        if (!isAbort) console.error(err);
    }


    async stopGeneration(convId: string) {
        const state = this.shared.runStates.get(convId);
        if (state) {
            state.stopped = true;
            this.shared.abortControllers.get(convId)?.abort();
            this.shared.abortControllers.delete(convId);
            state.approvals = [];
            state.resolver?.(false);
            state.resolver = null;
            this.shared.runStates.delete(convId);
            setRunActive(this.shared, convId, false);
        }
        await settlePendingMessage(this.shared, convId);
    }

    cleanupConversation(convId: string) {
        const state = this.shared.runStates.get(convId);
        if (state) {
            state.stopped = true;
            state.approvals = [];
            state.resolver?.(false);
            state.resolver = null;
        }
        this.shared.runStates.delete(convId);
        this.shared.abortControllers.delete(convId);
    }


    isStreaming(convId: string): boolean {
        return this.shared.runStates.has(convId);
    }

    approveCurrent(convId: string): void {
        this.approvals.resolve(convId, true);
    }

    denyCurrent(convId: string): void {
        this.approvals.resolve(convId, false);
    }
}

export function createChatRunner(store: StoreHandle): ChatRunner {
    const engine = new ChatRunnerEngine(store);
    return {
        isStreaming: (convId) => engine.isStreaming(convId),
        startGeneration: (convId, pendingMsg, useTools) =>
            engine.startGeneration(convId, pendingMsg, useTools),
        approveCurrent: (convId) => engine.approveCurrent(convId),
        denyCurrent: (convId) => engine.denyCurrent(convId),
        stopGeneration: (convId) => engine.stopGeneration(convId),
        cleanupConversation: (convId) => engine.cleanupConversation(convId),
    };
}
