import { Moon, Pin, Sun, Minus, X } from "lucide-react";
import { Button } from "./Button";
import { useThemeStore } from "@/stores/themeStore";
import { useWindowControls } from "@/hooks/useWindow";

interface TitleBarProps {
    title: string;
}

export function TitleBar({ title }: TitleBarProps) {
    const { theme, toggleTheme } = useThemeStore();
    const { togglePin, windowMinimize, windowClose } = useWindowControls();

    return (
        <header
            data-tauri-drag-region
            className="relative z-30 flex h-12 shrink-0 items-center gap-2.5 border-b border-brand-200/50 bg-white/60 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-ink/60"
        >
            <h1 className="pointer-events-none truncate text-sm font-semibold">
                {title}
            </h1>

            <div className="flex-1" />

            <Button
                variant="icon"
                aria-label="切换主题"
                onClick={toggleTheme}
            >
                {theme === "dark" ? (
                    <Moon className="size-4" />
                ) : (
                    <Sun className="size-4" />
                )}
            </Button>

            <Button variant="icon" aria-label="窗口置顶" onClick={togglePin}>
                <Pin className="size-4" />
            </Button>

            <div className="mx-1.5 h-5 w-px bg-brand-200/40 dark:bg-white/10" />

            <Button
                variant="icon"
                aria-label="最小化"
                onClick={windowMinimize}
            >
                <Minus className="size-4" />
            </Button>
            <Button variant="icon" danger aria-label="关闭" onClick={windowClose}>
                <X className="size-4" />
            </Button>
        </header>
    );
}
