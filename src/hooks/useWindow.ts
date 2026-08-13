import { getCurrentWindow } from "@tauri-apps/api/window";


function tryGetWindow() {
    try {
        return getCurrentWindow();
    } catch {
        return null;
    }
}

export function useWindowControls() {
    const appWindow = tryGetWindow();

    const togglePin = async () => {
        if (!appWindow) return;
        try {
            const pinned = await appWindow.isAlwaysOnTop();
            await appWindow.setAlwaysOnTop(!pinned);
        } catch (err) {
            console.error("切换置顶失败", err);
        }
    };

    const windowMinimize = () => {
        void appWindow?.minimize();
    };

    const windowClose = () => {
        if (appWindow) {
            void appWindow.close().catch(() => {});
        }
    };

    const startDrag = () => {
        void appWindow?.startDragging();
    };

    return { togglePin, windowMinimize, windowClose, startDrag };
}
