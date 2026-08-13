import { useEffect, useRef } from "react";
import { Bird } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { MessageItem } from "./MessageItem";
import { useChatStore } from "@/stores/chatStore";

const suggestions = [
    "介绍你自己",
    "写一个快排算法",
    "帮我润色一段文字",
    "解释闭包",
];

interface MessageListProps {
    messages: ChatMessage[];
    isThinking: boolean;
}

export function MessageList({ messages, isThinking }: MessageListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const setInput = useChatStore((s) => s.setInput);

    const last = messages[messages.length - 1];
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, isThinking, last?.content, last?.reasoning]);

    return (
        <div
            ref={scrollRef}
            className="relative flex-1 scrollbar-thin overflow-y-auto px-6 pt-6 pb-2"
        >
            {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-brand-700/10 shadow-soft">
                        <Bird className="size-7 text-brand-500" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold">你好，我是逆云</h2>
                    <p className="mt-1 max-w-xs text-sm text-brand-400 dark:text-brand-400/60">
                        有什么可以帮你的？输入消息或选择下方建议开始对话。
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {suggestions.map((s) => (
                            <Button
                                key={s}
                                variant="chip"
                                size="sm"
                                onClick={() => setInput(s)}
                            >
                                {s}
                            </Button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-6">
                    {messages.map((m) => (
                        <MessageItem
                            key={m.id}
                            message={m}
                            onRegenerate={() =>
                                void useChatStore.getState().regenerateMessage(m.id)
                            }
                            onCopy={() =>
                                void useChatStore.getState().copyMessage(m.id)
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
