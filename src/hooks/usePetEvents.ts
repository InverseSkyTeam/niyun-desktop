import { useEffect } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { usePetStore, type PetStateSnapshot } from "@/stores/petStore";
import { isTauri } from "@/lib/tauri";


export async function openPetOverlay() {
    if (!isTauri()) return;
    const existing = await WebviewWindow.getByLabel("pet");
    if (existing) {
        await existing.show();
        await existing.setFocus();
        broadcastPetState();
        return;
    }
    new WebviewWindow("pet", {
        url: "/index.html?view=pet",
        title: "逆云桌宠",
        width: 600,
        height: 600,
        decorations: false,
        resizable: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        shadow: false,
        center: false,
        x: 80,
        y: 120,
    });
}


export function broadcastPetState() {
    if (!isTauri()) return;
    const s = usePetStore.getState();
    emit("pet-state", {
        mood: s.petMood,
        petStats: s.petStats,
        isSleeping: s.isSleeping,
        eating: s.eating,
        weatherCG: s.weatherCG,
    } satisfies PetStateSnapshot);
}


export function usePetBroadcast() {
    useEffect(() => {
        if (!isTauri()) return;

        let unlistenInteract: UnlistenFn | undefined;
        void (async () => {
            unlistenInteract = await listen("pet-interact", (e) => {
                const action = e.payload as "feed" | "pet" | "peek";
                const s = usePetStore.getState();
                if (action === "feed") s.handleFeed();
                else if (action === "pet") s.handlePet();
                else if (action === "peek") void s.handlePeek();
            });
        })();

        const unsub = usePetStore.subscribe((state, prev) => {
            if (
                state.petMood !== prev.petMood ||
                state.petStats !== prev.petStats ||
                state.isSleeping !== prev.isSleeping ||
                state.eating !== prev.eating ||
                state.weatherCG !== prev.weatherCG
            ) {
                broadcastPetState();
            }
        });

        return () => {
            unlistenInteract?.();
            unsub();
        };
    }, []);
}


export function usePetSync() {
    useEffect(() => {
        if (!isTauri()) return;
        let unlisten: UnlistenFn | undefined;
        void (async () => {
            unlisten = await listen("pet-state", (e) => {
                usePetStore.getState().applySnapshot(e.payload as PetStateSnapshot);
            });
        })();
        return () => {
            unlisten?.();
        };
    }, []);
}
