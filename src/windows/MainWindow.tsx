import { useEffect } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { GalgameLayout } from "@/components/galgame/GalgameLayout";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { useThemeStore } from "@/stores/themeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useChatStore } from "@/stores/chatStore";
import { usePetStore, onAssistantReply } from "@/stores/petStore";
import { usePetBroadcast, openPetOverlay, broadcastPetState } from "@/hooks/usePetEvents";

export function MainWindow() {
    usePetBroadcast();

    useEffect(() => {
        useThemeStore.getState().loadTheme();
        useSettingsStore.getState().loadSettings();
        void useSettingsStore.getState().syncWindowState();
        void useSettingsStore.getState().restoreWorkspace();
        useChatStore.getState().setOnAssistantReply(onAssistantReply);
        void useChatStore.getState().initConversations();
        usePetStore.getState().startTickers();

        const t = setTimeout(() => {
            void openPetOverlay();
            setTimeout(broadcastPetState, 500);
        }, 1000);

        return () => {
            clearTimeout(t);
            usePetStore.getState().stopTickers();
            useChatStore.getState().setOnAssistantReply(null);
        };
    }, []);

    return (
        <div
            className="relative flex h-screen w-screen overflow-hidden bg-canvas font-sans text-brand-900 antialiased dark:bg-ink dark:text-brand-50"
            style={{ opacity: "var(--window-opacity, 1)" }}
        >
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -left-40 size-[28rem] rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-700/20" />
                <div className="absolute top-1/3 -right-40 size-[24rem] rounded-full bg-brand-500/15 blur-3xl dark:bg-brand-600/15" />
                <div className="absolute bottom-0 left-1/3 size-[20rem] rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-600/10" />
            </div>
            <div className="relative z-10 flex h-full w-full">
                <MemoryRouter initialEntries={["/"]}>
                    <Routes>
                        <Route path="/" element={<ChatLayout />} />
                        <Route path="/galgame" element={<GalgameLayout />} />
                        <Route path="/settings" element={<SettingsLayout />} />
                    </Routes>
                </MemoryRouter>
            </div>
        </div>
    );
}
