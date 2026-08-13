import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { useSettingsStore, initAutoStartState } from "@/stores/settingsStore";

export function PetSection() {
    const petSettings = useSettingsStore((s) => s.petSettings);
    const setAlwaysOnTop = useSettingsStore((s) => s.setAlwaysOnTop);
    const setAutoStart = useSettingsStore((s) => s.setAutoStart);
    const setWindowOpacity = useSettingsStore((s) => s.setWindowOpacity);
    const reminderEnabled = useSettingsStore((s) => s.reminderEnabled);
    const reminderInterval = useSettingsStore((s) => s.reminderInterval);
    const setReminderEnabled = useSettingsStore((s) => s.setReminderEnabled);
    const setReminderInterval = useSettingsStore((s) => s.setReminderInterval);

    useEffect(() => {
        void useSettingsStore.getState().syncWindowState();
        void (async () => {
            const real = await initAutoStartState();
            useSettingsStore.setState((s) => ({
                petSettings: { ...s.petSettings, autoStart: real },
            }));
        })();
    }, []);

    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-base font-semibold">桌宠</h2>
                <p className="mt-0.5 text-xs text-brand-500 dark:text-brand-400">
                    窗口与桌宠行为设置。
                </p>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[13px] font-medium">窗口置顶</p>
                    <p className="text-[11px] text-brand-500 dark:text-brand-400">
                        将窗口保持在最前
                    </p>
                </div>
                <Switch
                    checked={petSettings.alwaysOnTop}
                    onChange={(v) => void setAlwaysOnTop(v)}
                />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[13px] font-medium">开机自启</p>
                    <p className="text-[11px] text-brand-500 dark:text-brand-400">
                        系统登录时自动启动
                    </p>
                </div>
                <Switch
                    checked={petSettings.autoStart}
                    onChange={(v) => void setAutoStart(v)}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium">窗口透明度</label>
                    <span className="font-mono text-xs text-brand-500 dark:text-brand-400">
                        {petSettings.windowOpacity}%
                    </span>
                </div>
                <input
                    type="range"
                    min="40"
                    max="100"
                    step="5"
                    value={petSettings.windowOpacity}
                    onChange={(e) => void setWindowOpacity(Number(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-brand-200/60 accent-brand-900 dark:bg-brand-700 dark:accent-brand-50"
                />
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[13px] font-medium">定时提醒</p>
                    <p className="text-[11px] text-brand-500 dark:text-brand-400">
                        每隔一段时间提醒你休息
                    </p>
                </div>
                <Switch
                    checked={reminderEnabled}
                    onChange={setReminderEnabled}
                />
            </div>

            {reminderEnabled && (
                <div className="space-y-2">
                    <label className="text-[13px] font-medium">提醒间隔</label>
                    <div className="grid grid-cols-5 gap-2">
                        {[15, 30, 45, 60, 90].map((opt) => (
                            <Button
                                key={opt}
                                variant="outline"
                                size="sm"
                                block
                                active={reminderInterval === opt}
                                onClick={() => setReminderInterval(opt)}
                            >
                                {opt}分
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
