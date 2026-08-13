import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAIConfigStore } from "@/stores/aiConfigStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { pickWorkspace } from "@/lib/tools";
import type { AIConfig, AIProviderConfig } from "@/lib/types";
import { ProviderCard } from "./ProviderCard";


function updateProviderAtIndex(
    config: AIConfig,
    index: number,
    next: AIProviderConfig,
): AIConfig {
    const updated = structuredClone(config);
    updated.providers[index] = next;
    return updated;
}

function WorkspacePicker({
    workspaceRoot,
    onPick,
}: {
    workspaceRoot: string | null;
    onPick: () => void;
}) {
    return (
        <div className="rounded-2xl border border-brand-200/50 bg-white/70 p-3 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[13px] font-medium">AI 工具工作目录</p>
                    <p className="mt-0.5 text-[11px] text-brand-500 dark:text-brand-400">
                        文件读写与命令执行将限制在此目录内（沙箱）
                    </p>
                    <p className="mt-1.5 truncate font-mono text-[11px] text-brand-600 dark:text-brand-300">
                        {workspaceRoot ?? "未设置，AI 的文件/命令工具暂不可用"}
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={onPick}
                >
                    <FolderOpen className="size-3.5" />
                    选择目录
                </Button>
            </div>
        </div>
    );
}

export function AISection() {
    const initialConfig = useAIConfigStore((s) => s.aiConfig);
    const updateConfig = useAIConfigStore((s) => s.updateConfig);
    const [config, setConfig] = useState<AIConfig>(initialConfig);

    useEffect(() => {
        updateConfig(config);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [config]);

    const workspaceRoot = useSettingsStore((s) => s.workspaceRoot);
    const setWorkspaceRoot = useSettingsStore((s) => s.setWorkspaceRoot);

    async function onPickWorkspace() {
        const path = await pickWorkspace();
        if (path) setWorkspaceRoot(path);
    }

    return (
        <section className="space-y-6">
            <div>
                <h2 className="text-base font-semibold">AI 设置</h2>
                <p className="mt-0.5 text-xs text-brand-500 dark:text-brand-400">
                    配置 AI 厂商与模型。
                </p>
            </div>

            <WorkspacePicker
                workspaceRoot={workspaceRoot}
                onPick={() => void onPickWorkspace()}
            />

            <div className="space-y-3">
                {config.providers.map((provider, index) => (
                    <ProviderCard
                        key={provider.id}
                        provider={provider}
                        onChange={(next) =>
                            setConfig((cfg) =>
                                updateProviderAtIndex(cfg, index, next),
                            )
                        }
                    />
                ))}
            </div>
        </section>
    );
}
