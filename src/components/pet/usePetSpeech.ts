import { useEffect, useState } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isTauri } from "@/lib/tauri";

const DEFAULT_DURATION_MS = 5000;

export interface SpeechState {
    text: string;
    visible: boolean;
}


export function usePetSpeech() {
    const [speech, setSpeech] = useState<SpeechState>({ text: "", visible: false });

    useEffect(() => {
        if (!isTauri()) return;
        let unlisten: UnlistenFn | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        void (async () => {
            unlisten = await listen<{ text: string; duration?: number }>(
                "pet-speak",
                (e) => {
                    if (timer) clearTimeout(timer);
                    setSpeech({ text: e.payload.text, visible: true });
                    timer = setTimeout(
                        () => setSpeech((s) => ({ ...s, visible: false })),
                        e.payload.duration ?? DEFAULT_DURATION_MS,
                    );
                },
            );
        })();
        return () => {
            unlisten?.();
            if (timer) clearTimeout(timer);
        };
    }, []);

    const dismiss = () => setSpeech((s) => ({ ...s, visible: false }));
    return { speech, dismiss };
}
