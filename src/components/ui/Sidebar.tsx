import { useNavigate } from "react-router-dom";
import { BookOpen, MessageSquarePlus, Settings, Trash2 } from "lucide-react";
import { Button } from "./Button";
import { NiyunAvatar } from "./NiyunAvatar";
import { css } from "@/lib/css";
import { useChatStore } from "@/stores/chatStore";
import type { Conversation } from "@/lib/types";

function ConversationItem({
    conversation,
    activeId,
    isStreaming,
    onOpen,
    onRemove,
}: {
    conversation: Conversation;
    activeId: string | null;
    isStreaming: (id: string) => boolean;
    onOpen: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    const { id, title } = conversation;
    return (
        <li>
            <div
                className={css(
                    "group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 transition",
                    id === activeId
                        ? "bg-gradient-to-r from-brand-500/15 to-brand-700/10 text-brand-700 shadow-soft dark:from-brand-500/20 dark:to-brand-700/10 dark:text-brand-100"
                        : "text-brand-700 hover:bg-white/60 dark:text-brand-300 dark:hover:bg-white/5",
                )}
                onClick={() => onOpen(id)}
            >
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        {isStreaming(id) && (
                            <span
                                className="inline-block size-1.5 shrink-0 animate-pulse rounded-full bg-gradient-to-br from-brand-500 to-brand-700 shadow-[0_0_6px_rgba(140,107,230,0.6)]"
                                aria-label="正在输出"
                            />
                        )}
                        <p className="truncate text-[13px] leading-tight font-medium">
                            {title}
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    aria-label={`删除会话 ${title}`}
                    className="shrink-0 rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(id);
                    }}
                >
                    <Trash2 className="size-3.5" />
                </button>
            </div>
        </li>
    );
}

function ConversationList({
    conversations,
    activeId,
    isStreaming,
    onOpen,
    onRemove,
}: {
    conversations: Conversation[];
    activeId: string | null;
    isStreaming: (id: string) => boolean;
    onOpen: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    return (
        <div className="mt-3 flex-1 scrollbar-thin overflow-y-auto px-2.5">
            <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-brand-400 uppercase dark:text-brand-400/60">
                会话
            </p>
            <ul className="space-y-0.5">
                {conversations.map((c) => (
                    <ConversationItem
                        key={c.id}
                        conversation={c}
                        activeId={activeId}
                        isStreaming={isStreaming}
                        onOpen={onOpen}
                        onRemove={onRemove}
                    />
                ))}
            </ul>
        </div>
    );
}

export function Sidebar() {
    const navigate = useNavigate();
    const conversations = useChatStore((s) => s.conversations);
    const activeId = useChatStore((s) => s.activeId);
    const isStreaming = useChatStore((s) => s.isStreaming);
    const newConversation = useChatStore((s) => s.newConversation);
    const openConversation = useChatStore((s) => s.openConversation);
    const removeConversation = useChatStore((s) => s.removeConversation);

    function openChat(id: string) {
        navigate("/");
        void openConversation(id);
    }

    return (
        <aside className="flex w-60 shrink-0 flex-col border-r border-brand-200/50 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <div
                data-tauri-drag-region
                className="flex cursor-default items-center gap-2.5 px-4 py-4"
            >
                <div className="pointer-events-none">
                    <NiyunAvatar size={32} />
                </div>
                <div className="pointer-events-none min-w-0">
                    <p className="truncate text-sm leading-tight font-semibold">
                        逆云学习版
                    </p>
                </div>
            </div>

            <div className="px-3.5">
                <Button
                    variant="outline"
                    block
                    onClick={() => {
                        navigate("/");
                        void newConversation();
                    }}
                >
                    <MessageSquarePlus className="size-4" />
                    新建对话
                </Button>
            </div>

            <ConversationList
                conversations={conversations}
                activeId={activeId}
                isStreaming={isStreaming}
                onOpen={openChat}
                onRemove={(id) => void removeConversation(id)}
            />

            <div className="border-t border-brand-200/50 p-2.5 dark:border-white/10">
                <Button
                    variant="ghost"
                    block
                    align="start"
                    onClick={() => navigate("/galgame")}
                >
                    <BookOpen className="size-4" />
                    视觉小说
                </Button>
                <Button
                    variant="ghost"
                    block
                    align="start"
                    onClick={() => navigate("/settings")}
                >
                    <Settings className="size-4" />
                    设置
                </Button>
            </div>
        </aside>
    );
}
