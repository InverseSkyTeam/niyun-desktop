import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { isTauri } from "@/lib/tauri";

export const PET_W = 180;
export const PET_H = 198;
const POLL_INTERVAL_MS = 250;
const STUCK_RECOVERY_MS = 5000;

type TauriWindow = ReturnType<typeof getCurrentWindow>;


function tryGetTauriWindow(): TauriWindow | null {
    try {
        return getCurrentWindow();
    } catch {
        return null;
    }
}


async function readWindowPosition(
    win: TauriWindow,
): Promise<{ x: number; y: number } | null> {
    try {
        const pos = await win.outerPosition();
        return { x: pos.x, y: pos.y };
    } catch {
        return null;
    }
}


async function readScaleFactor(win: TauriWindow): Promise<number> {
    try {
        return await win.scaleFactor();
    } catch {
        return 1;
    }
}


class PassthroughController {
    private petAreaRef: React.RefObject<HTMLDivElement | null>;
    private shouldStayInteractive: () => boolean;
    private win: TauriWindow;
    private ignoring = false;
    private stuckSince = 0;
    private petImageLoaded = false;
    private canvas = document.createElement("canvas");
    private ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    constructor(
        petAreaRef: React.RefObject<HTMLDivElement | null>,
        shouldStayInteractive: () => boolean,
        win: TauriWindow,
    ) {
        this.petAreaRef = petAreaRef;
        this.shouldStayInteractive = shouldStayInteractive;
        this.win = win;
        const img = new Image();
        img.onload = () => {
            this.canvas.width = PET_W;
            this.canvas.height = PET_H;
            this.ctx?.drawImage(img, 0, 0, PET_W, PET_H);
            this.petImageLoaded = true;
        };
        img.src = "/niyun.png";
    }

    
    isTransparentAt(x: number, y: number): boolean {
        const el = this.petAreaRef.current;
        if (!el) return true;
        const r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) return true;
        if (!this.isInsideRect(r, x, y)) return true;
        return this.isOpaquePixel(r, x, y);
    }

    private isOpaquePixel(r: DOMRect, x: number, y: number): boolean {
        if (!this.petImageLoaded || !this.ctx) return false;
        return this.readAlphaAt(r, x, y) < 128;
    }

    private isInsideRect(r: DOMRect, x: number, y: number): boolean {
        return x >= r.left && x < r.right && y >= r.top && y < r.bottom;
    }

    private readAlphaAt(r: DOMRect, x: number, y: number): number {
        const localX = Math.floor(x - r.left);
        const localY = Math.floor(y - r.top);
        if (localX < 0 || localX >= PET_W || localY < 0 || localY >= PET_H) {
            return 0;
        }
        return this.ctx!.getImageData(localX, localY, 1, 1).data[3];
    }

    shouldIgnoreAt(x: number, y: number): boolean {
        if (this.shouldStayInteractive()) return false;
        return this.isTransparentAt(x, y);
    }

    isStuck(): boolean {
        return (
            this.ignoring &&
            this.stuckSince > 0 &&
            Date.now() - this.stuckSince > STUCK_RECOVERY_MS
        );
    }

    async setIgnoring(ignore: boolean): Promise<void> {
        if (this.ignoring === ignore) return;
        this.ignoring = ignore;
        try {
            await this.win.setIgnoreCursorEvents(ignore);
        } catch {
            
        }
    }

    
    async syncTo(x: number, y: number): Promise<void> {
        const wantIgnore = this.shouldIgnoreAt(x, y);
        if (wantIgnore === this.ignoring) return;
        this.stuckSince = wantIgnore ? this.stuckSince || Date.now() : 0;
        await this.setIgnoring(wantIgnore);
    }
}


export function usePetPassthrough(shouldStayInteractive: () => boolean) {
    const petAreaRef = useRef<HTMLDivElement>(null);
    const interactiveRef = useRef(shouldStayInteractive);
    interactiveRef.current = shouldStayInteractive;

    useEffect(() => {
        if (!isTauri()) return;
        const win = tryGetTauriWindow();
        if (!win) return;
        const tauriWin: TauriWindow = win;

        const controller = new PassthroughController(
            petAreaRef,
            () => interactiveRef.current(),
            tauriWin,
        );

        let disposed = false;
        let unlistenMove: UnlistenFn | undefined;
        let pollTimer: ReturnType<typeof setInterval> | undefined;
        const winPos = { x: 0, y: 0 };
        let scaleFactor = 1;

        async function updateWinPos() {
            const pos = await readWindowPosition(tauriWin);
            if (pos) {
                winPos.x = pos.x;
                winPos.y = pos.y;
            }
        }

        async function updateScale() {
            scaleFactor = await readScaleFactor(tauriWin);
        }

        const onMouseMove = (e: MouseEvent) => {
            void controller.setIgnoring(
                controller.shouldIgnoreAt(e.clientX, e.clientY),
            );
        };
        document.addEventListener("mousemove", onMouseMove);

        void (async () => {
            await updateWinPos();
            await updateScale();
            try {
                unlistenMove = await tauriWin.onMoved(updateWinPos);
            } catch {
                
            }
            if (disposed) return;
            pollTimer = setInterval(
                () => void pollCursor(controller, winPos, () => scaleFactor),
                POLL_INTERVAL_MS,
            );
        })();

        return () => {
            disposed = true;
            unlistenMove?.();
            if (pollTimer) clearInterval(pollTimer);
            document.removeEventListener("mousemove", onMouseMove);
        };
    }, []);

    return petAreaRef;
}


async function pollCursor(
    controller: PassthroughController,
    winPos: { x: number; y: number },
    getScale: () => number,
) {
    try {
        if (controller.isStuck()) {
            await controller.setIgnoring(false);
            return;
        }
        const [cx, cy] = await invoke<[number, number]>("get_cursor_pos");
        const localX = (cx - winPos.x) / getScale();
        const localY = (cy - winPos.y) / getScale();
        await controller.syncTo(localX, localY);
    } catch {
        
    }
}
