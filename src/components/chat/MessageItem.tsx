import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, RefreshCw, Sparkles, User } from "lucide-react";
import type { ChatMessage } from "@/lib/types";
import { NiyunAvatar } from "@/components/ui/NiyunAvatar";
import { css } from "@/lib/css";
import { Markdown } from "./Markdown";

interface MessageItemProps {
    message: ChatMessage;
    onRegenerate: () => void;
    onCopy: () => void;
}

export function MessageItem({ message, onRegenerate, onCopy }: MessageItemProps) {
    const isUser = message.role === "user";
    const [reasoningOpen, setReasoningOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const reasoningBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = reasoningBodyRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [message.reasoning]);

    const time = new Date(message.createdAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const copy = async () => {
        await onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div
            className={css(
                "group/msg flex gap-3",
                isUser ? "flex-row-reverse" : "flex-row",
            )}
        >
            {!isUser ? (
                <NiyunAvatar size={28} />
            ) : (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/20 to-brand-700/20">
                    <User className="size-4 text-brand-500" />
                </div>
            )}

            <div
                className={css(
                    "max-w-[78%] min-w-0",
                    isUser ? "items-end text-right" : "items-start",
                )}
            >
                <div
                    className={css(
                        "mb-1 flex items-center gap-2",
                        isUser ? "flex-row-reverse" : "flex-row",
                    )}
                >
                    <span className="text-xs font-semibold">
                        {isUser ? "你" : "逆云"}
                    </span>
                    <span className="text-[10px] text-brand-400/70">{time}</span>
                </div>

                {!isUser && message.reasoning && (
                    <div className="mb-1.5 overflow-hidden rounded-2xl border border-brand-200/50 bg-white/70 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5">
                        <button
                            type="button"
                            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[11px] font-medium text-brand-500 transition hover:bg-brand-100/60 hover:text-brand-700 dark:text-brand-300 dark:hover:bg-white/5 dark:hover:text-brand-100"
                            onClick={() => setReasoningOpen((v) => !v)}
                        >
                            <Sparkles className="size-3" />
                            思考过程
                            <ChevronDown
                                className={css(
                                    "ml-auto size-3 transition-transform duration-200",
                                    reasoningOpen || message.pending
                                        ? "rotate-180"
                                        : "",
                                )}
                            />
                        </button>
                        {(reasoningOpen || message.pending) && (
                            <div
                                ref={reasoningBodyRef}
                                className="reasoning-text scrollbar-thin max-h-40 overflow-y-auto px-3 pb-2.5 text-[11.5px] leading-relaxed whitespace-pre-wrap text-brand-900/70 dark:text-brand-100/70"
                            >
                                {message.reasoning}
                            </div>
                        )}
                    </div>
                )}

                {message.pending && !message.content ? (
                    <div className="flex items-center gap-1 rounded-2xl border border-brand-200/50 bg-white/60 px-4 py-3 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5">
                        <span className="think-dot size-1.5 rounded-full bg-brand-400" />
                        <span className="think-dot size-1.5 rounded-full bg-brand-400" />
                        <span className="think-dot size-1.5 rounded-full bg-brand-400" />
                    </div>
                ) : isUser ? (
                    <div className="msg-content inline-block rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap text-white shadow-glow dark:from-brand-700 dark:to-brand-900">
                        {message.content}
                    </div>
                ) : (
                    <div
                        className="msg-content md-content inline-block rounded-2xl border border-brand-200/50 bg-white/70 px-3.5 py-2.5 text-[13.5px] text-brand-900 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-brand-50"
                        style={{ fontSize: "var(--chat-font-size, 13.5px)" }}
                    >
                        <Markdown content={message.content ?? ""} />
                    </div>
                )}

                {!message.pending && (
                    <div
                        className={css(
                            "mt-1 flex gap-1 opacity-0 transition group-hover/msg:opacity-100",
                            isUser ? "justify-end" : "justify-start",
                        )}
                    >
                        <button
                            type="button"
                            aria-label="复制"
                            className="rounded p-1 text-brand-400/70 transition hover:bg-white/60 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-white"
                            onClick={copy}
                        >
                            {copied ? (
                                <Check className="size-3.5" />
                            ) : (
                                <Copy className="size-3.5" />
                            )}
                        </button>
                        {!isUser && (
                            <button
                                type="button"
                                aria-label="重新生成"
                                className="rounded p-1 text-brand-400/70 transition hover:bg-white/60 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-white"
                                onClick={onRegenerate}
                            >
                                <RefreshCw className="size-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
