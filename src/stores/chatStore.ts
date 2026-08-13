import { create, type StoreApi } from "zustand";
import type {
    ChatMessage,
    Conversation,
    ToolApprovalRequest,
} from "@/lib/types";
import { looksLikeProjectRequest } from "@/lib/tools";
import {
    loadConversations as dbLoadConversations,
    createConversation,
    removeConversation as dbRemoveConversation,
    loadMessages as dbLoadMessages,
    addMessage,
    deleteMessages,
    touchConversation,
} from "@/lib/db";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/systemPrompt";
import { createChatRunner, type ChatRunner } from "./chatRun";

const uid = () => Math.random().toString(36).slice(2, 10);

export interface ChatState {
    conversations: Conversation[];
    activeId: string | null;
    messagesByConversation: Record<string, ChatMessage[]>;
    input: string;
    isThinking: boolean;
    approvalRequests: ToolApprovalRequest[];
    streamingIds: string[];
    onAssistantReply: ((text: string) => void) | null;

    setInput: (text: string) => void;
    setOnAssistantReply: (fn: ((text: string) => void) | null) => void;
    initConversations: () => Promise<void>;
    newConversation: () => Promise<void>;
    openConversation: (id: string) => Promise<void>;
    removeConversation: (id: string) => Promise<void>;
    sendMessage: () => Promise<void>;
    handleApprove: () => void;
    handleDeny: () => void;
    stopGeneration: () => Promise<void>;
    copyMessage: (id: string) => Promise<void>;
    regenerateMessage: (id: string) => Promise<void>;
    isStreaming: (id: string) => boolean;
}

type ChatSetState = StoreApi<ChatState>["setState"];
type ChatGetState = () => ChatState;

interface ChatStoreContext {
    get: ChatGetState;
    set: ChatSetState;
    runner: ChatRunner;
}

function pushMessage(set: ChatSetState, convId: string, msg: ChatMessage) {
    set((s) => ({
        messagesByConversation: {
            ...s.messagesByConversation,
            [convId]: [...(s.messagesByConversation[convId] ?? []), msg],
        },
    }));
}

function createUserMessage(text: string): ChatMessage {
    return {
        id: uid(),
        role: "user",
        content: text,
        createdAt: Date.now(),
    };
}

function createPendingMessage(): ChatMessage {
    return {
        id: uid(),
        role: "assistant",
        content: "",
        reasoning: "",
        createdAt: Date.now(),
        pending: true,
    };
}

function currentMessages(get: ChatGetState): ChatMessage[] {
    const convId = get().activeId;
    if (!convId) return [];
    return get().messagesByConversation[convId] ?? [];
}


function findRegeneratePoint(
    msgs: ChatMessage[],
    id: string,
): { kept: ChatMessage[]; removed: ChatMessage[] } | null {
    const idx = msgs.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    for (let i = idx - 1; i >= 0; i--) {
        if (msgs[i].role === "user") {
            return { kept: msgs.slice(0, i + 1), removed: msgs.slice(i + 1) };
        }
    }
    return null;
}

function buildRemovalState(s: ChatState, id: string): Partial<ChatState> {
    const nextConvs = s.conversations.filter((c) => c.id !== id);
    const nextMsgs = { ...s.messagesByConversation };
    delete nextMsgs[id];
    const next: Partial<ChatState> = {
        conversations: nextConvs,
        messagesByConversation: nextMsgs,
        streamingIds: s.streamingIds.filter((x) => x !== id),
    };
    if (s.activeId === id) {
        next.activeId = nextConvs[0]?.id ?? null;
        next.approvalRequests = [];
        next.isThinking = false;
    }
    return next;
}


async function initConversations(ctx: ChatStoreContext) {
    const { set } = ctx;
    try {
        const conversations = await dbLoadConversations();
        if (conversations.length > 0) {
            await openFirstConversation(ctx, conversations);
        } else {
            set({ conversations });
        }
    } catch (err) {
        console.error("加载会话失败", err);
        set({ conversations: [] });
    }
}

async function openFirstConversation(
    { set }: ChatStoreContext,
    conversations: Conversation[],
) {
    const first = conversations[0];
    set({ conversations, activeId: first.id });
    const msgs = await dbLoadMessages(first.id);
    set((s) => ({
        messagesByConversation: {
            ...s.messagesByConversation,
            [first.id]: msgs,
        },
    }));
}

async function newConversation(ctx: ChatStoreContext) {
    const { get, set } = ctx;
    const conv: Conversation = {
        id: uid(),
        title: "新对话",
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        createdAt: Date.now(),
        lastActive: Date.now(),
    };
    await createConversation(conv.id, conv.title, conv.systemPrompt);
    set((s) => ({
        conversations: [conv, ...s.conversations],
        activeId: conv.id,
    }));
    await get().openConversation(conv.id);
}

async function loadMessagesIfMissing({ get, set }: ChatStoreContext, id: string) {
    if (get().messagesByConversation[id]) return;
    const msgs = await dbLoadMessages(id);
    set((s) => ({
        messagesByConversation: {
            ...s.messagesByConversation,
            [id]: msgs,
        },
    }));
}

async function touchLastActive({ set }: ChatStoreContext, id: string) {
    await touchConversation(id);
    set((s) => ({
        conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, lastActive: Date.now() } : c,
        ),
    }));
}

async function openConversation(ctx: ChatStoreContext, id: string) {
    const { set } = ctx;
    set({ activeId: id });
    await loadMessagesIfMissing(ctx, id);
    await touchLastActive(ctx, id);
}

async function removeConversation(ctx: ChatStoreContext, id: string) {
    const { runner, set } = ctx;
    runner.cleanupConversation(id);
    await dbRemoveConversation(id);
    set((s) => buildRemovalState(s, id));
}


async function ensureConversation(ctx: ChatStoreContext): Promise<string> {
    const { get } = ctx;
    const activeId = get().activeId;
    if (activeId) return activeId;
    await get().newConversation();
    return get().activeId!;
}

async function titleFromFirstMessage(ctx: ChatStoreContext, convId: string, text: string) {
    const { get, set } = ctx;
    const isFirstUserMessage =
        currentMessages(get).filter((m) => m.role === "user").length === 1;
    if (!isFirstUserMessage) return;
    set((s) => ({
        conversations: s.conversations.map((c) =>
            c.id === convId ? { ...c, title: text.slice(0, 18) } : c,
        ),
    }));
    await touchConversation(convId);
}

async function sendUserText(ctx: ChatStoreContext, convId: string, text: string) {
    const { set, runner } = ctx;
    const userMsg = createUserMessage(text);
    pushMessage(set, convId, userMsg);
    await addMessage(convId, userMsg);
    await titleFromFirstMessage(ctx, convId, text);

    const pendingMsg = createPendingMessage();
    pushMessage(set, convId, pendingMsg);
    await addMessage(convId, pendingMsg);

    await runner.startGeneration(
        convId,
        pendingMsg,
        looksLikeProjectRequest(text),
    );
}

async function sendMessage(ctx: ChatStoreContext) {
    const { get, runner } = ctx;
    const text = get().input.trim();
    if (!text) return;
    const convId = await ensureConversation(ctx);
    if (runner.isStreaming(convId)) return;
    get().setInput("");
    await sendUserText(ctx, convId, text);
}

async function regenerateMessage(ctx: ChatStoreContext, id: string) {
    const { get, set, runner } = ctx;
    const convId = get().activeId;
    if (!convId || runner.isStreaming(convId)) return;

    const point = findRegeneratePoint(currentMessages(get), id);
    if (!point) return;
    const { kept, removed } = point;
    set((s) => ({
        messagesByConversation: {
            ...s.messagesByConversation,
            [convId]: kept,
        },
    }));
    if (removed.length > 0) {
        await deleteMessages(convId, removed.map((m) => m.id));
    }

    const pendingMsg = createPendingMessage();
    pushMessage(set, convId, pendingMsg);
    await addMessage(convId, pendingMsg);

    const lastUserText = kept[kept.length - 1]?.content ?? "";
    await runner.startGeneration(
        convId,
        pendingMsg,
        looksLikeProjectRequest(lastUserText),
    );
}

async function copyMessage(ctx: ChatStoreContext, id: string) {
    const { get } = ctx;
    const m = currentMessages(get).find((x) => x.id === id);
    if (!m) return;
    try {
        await navigator.clipboard.writeText(m.content);
    } catch {
        
    }
}

function handleApprove(ctx: ChatStoreContext) {
    const { get, runner } = ctx;
    const convId = get().activeId;
    if (convId) runner.approveCurrent(convId);
}

function handleDeny(ctx: ChatStoreContext) {
    const { get, runner } = ctx;
    const convId = get().activeId;
    if (convId) runner.denyCurrent(convId);
}

async function stopGeneration(ctx: ChatStoreContext) {
    const { get, runner } = ctx;
    const convId = get().activeId;
    if (convId) await runner.stopGeneration(convId);
}


export const useChatStore = create<ChatState>((set, get) => {
    const ctx: ChatStoreContext = {
        get,
        set,
        runner: createChatRunner({ getState: get, setState: set }),
    };
    return {
        conversations: [],
        activeId: null,
        messagesByConversation: {},
        input: "",
        isThinking: false,
        approvalRequests: [],
        streamingIds: [],
        onAssistantReply: null,

        setInput: (text: string) => set({ input: text }),
        setOnAssistantReply: (fn: ((text: string) => void) | null) =>
            set({ onAssistantReply: fn }),
        isStreaming: (id: string) => ctx.runner.isStreaming(id),

        initConversations: () => initConversations(ctx),
        newConversation: () => newConversation(ctx),
        openConversation: (id: string) => openConversation(ctx, id),
        removeConversation: (id: string) => removeConversation(ctx, id),

        sendMessage: () => sendMessage(ctx),
        regenerateMessage: (id: string) => regenerateMessage(ctx, id),
        handleApprove: () => handleApprove(ctx),
        handleDeny: () => handleDeny(ctx),
        stopGeneration: () => stopGeneration(ctx),
        copyMessage: (id: string) => copyMessage(ctx, id),
    };
});
