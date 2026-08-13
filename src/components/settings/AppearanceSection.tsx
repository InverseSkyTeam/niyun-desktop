import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useThemeStore } from "@/stores/themeStore";
import { useSettingsStore } from "@/stores/settingsStore";

export function AppearanceSection() {
    const theme = useThemeStore((s) => s.theme);
    const setTheme = useThemeStore((s) => s.setTheme);
    const fontSize = useSettingsStore((s) => s.petSettings.fontSize);
    const setFontSize = useSettingsStore((s) => s.setFontSize);

    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-base font-semibold">外观</h2>
                <p className="mt-0.5 text-xs text-brand-500 dark:text-brand-400">
                    自定义应用的主题与显示。
                </p>
            </div>

            <div className="space-y-2">
                <label className="text-[13px] font-medium">主题模式</label>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        block
                        active={theme === "light"}
                        onClick={() => setTheme("light")}
                    >
                        <Sun className="size-4" />
                        亮色
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        block
                        active={theme === "dark"}
                        onClick={() => setTheme("dark")}
                    >
                        <Moon className="size-4" />
                        暗色
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium">字体大小</label>
                    <span className="font-mono text-xs text-brand-500 dark:text-brand-400">
                        {fontSize}px
                    </span>
                </div>
                <input
                    type="range"
                    min="12"
                    max="18"
                    step="1"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-brand-200/60 accent-brand-900 dark:bg-brand-700 dark:accent-brand-50"
                />
                <div className="flex justify-between text-[10px] text-brand-400 dark:text-brand-500">
                    <span>小</span>
                    <span>默认</span>
                    <span>大</span>
                </div>
            </div>
        </section>
    );
}
