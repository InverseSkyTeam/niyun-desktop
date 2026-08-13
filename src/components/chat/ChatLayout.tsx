import { useEffect } from "react";
import { Sidebar } from "@/components/ui/Sidebar";
import { TitleBar } from "@/components/ui/TitleBar";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ToolApprovalBar } from "./ToolApprovalBar";
import { useChatStore } from "@/stores/chatStore";
import { useAIConfigStore } from "@/stores/aiConfigStore";
import { usePetStore } from "@/stores/petStore";
import type { ChatMessage } from "@/lib/types";


const EMPTY_MESSAGES: ChatMessage[] = [];

export function ChatLayout() {
    const conversations = useChatStore((s) => s.conversations);
    const activeId = useChatStore((s) => s.activeId);
    const messages = useChatStore((s) =>
        s.activeId
            ? (s.messagesByConversation[s.activeId] ?? EMPTY_MESSAGES)
            : EMPTY_MESSAGES,
    );
    const isThinking = useChatStore((s) => s.isThinking);
    const refreshAIConfig = useAIConfigStore((s) => s.refreshAIConfig);
    const refreshReminder = usePetStore((s) => s.refreshReminder);

    useEffect(() => {
        refreshAIConfig();
        refreshReminder();
    }, [refreshAIConfig, refreshReminder]);

    const title = conversations.find((c) => c.id === activeId)?.title ?? "逆云";

    return (
        <>
            <Sidebar />
            <div className="relative flex min-w-0 flex-1 flex-col">
                <TitleBar title={title} />
                <MessageList messages={messages} isThinking={isThinking} />
                <ToolApprovalBar />
                <ChatInput />
            </div>
        </>
    );
}
