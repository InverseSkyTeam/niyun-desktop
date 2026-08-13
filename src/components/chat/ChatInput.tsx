import { useEffect, useRef } from "react";
import { Eraser, Send, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useChatStore } from "@/stores/chatStore";
import { useAIConfigStore } from "@/stores/aiConfigStore";
import { ModelDropdown } from "./ModelDropdown";

export function ChatInput() {
    const input = useChatStore((s) => s.input);
    const setInput = useChatStore((s) => s.setInput);
    const isThinking = useChatStore((s) => s.isThinking);
    const sendMessage = useChatStore((s) => s.sendMessage);
    const stopGeneration = useChatStore((s) => s.stopGeneration);

    const activeModel = useAIConfigStore((s) => s.activeModel);
    const aiModelGroups = useAIConfigStore((s) => s.aiModelGroups);
    const selectModel = useAIConfigStore((s) => s.selectModel);

    const taRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        autoResize();
    }, [input]);

    function autoResize() {
        const el = taRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }

    function submit() {
        if (!input.trim()) return;
        void sendMessage();
        autoResize();
    }

    function onEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    }

    return (
        <div className="shrink-0 px-6 py-4">
            <div className="mx-auto max-w-3xl">
                <div className="flex flex-col rounded-xl border border-brand-200 bg-brand-50 transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-200 dark:border-brand-700 dark:bg-brand-800 dark:focus-within:border-brand-500 dark:focus-within:ring-brand-700">
                    <textarea
                        ref={taRef}
                        rows={1}
                        value={input}
                        placeholder="逆云发消息…  (Enter 发送 / Shift+Enter 换行)"
                        className="max-h-40 w-full resize-none scrollbar-thin bg-transparent px-4 py-3 text-sm text-brand-900 placeholder:text-brand-400 focus:outline-none dark:text-brand-50 dark:placeholder:text-brand-500"
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={onEnter}
                    />
                    <div className="flex items-center justify-between px-3 pb-2.5">
                        <div className="flex items-center gap-0.5">
                            <ModelDropdown
                                activeModel={activeModel}
                                groups={aiModelGroups}
                                onSelect={selectModel}
                            />

                            <Button
                                variant="icon"
                                aria-label="清除输入"
                                onClick={() => setInput("")}
                            >
                                <Eraser className="size-4" />
                            </Button>
                        </div>

                        {isThinking ? (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => void stopGeneration()}
                            >
                                <Square className="size-3.5 fill-current" />
                                停止
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                size="sm"
                                disabled={!input.trim()}
                                onClick={submit}
                            >
                                发送
                                <Send className="size-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-brand-400 dark:text-brand-500">
                    逆云可能出错，重要信息请核实
                </p>
            </div>
        </div>
    );
}
