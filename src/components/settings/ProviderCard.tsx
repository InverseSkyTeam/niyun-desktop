import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import type { AIProviderConfig, AIModelConfig } from "@/lib/types";

const inputClass =
    "w-full rounded-lg border border-brand-200/60 bg-white px-2.5 py-1.5 text-xs text-brand-900 placeholder:text-brand-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none dark:border-brand-700 dark:bg-brand-900 dark:text-brand-50 dark:placeholder:text-brand-600 dark:focus:border-brand-500 dark:focus:ring-brand-700";

interface ProviderCardProps {
    provider: AIProviderConfig;
    onChange: (provider: AIProviderConfig) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-[11px] font-medium text-brand-500 dark:text-brand-400">
                {label}
            </label>
            {children}
        </div>
    );
}


function ProviderFields({
    provider,
    update,
}: {
    provider: AIProviderConfig;
    update: (fn: (p: AIProviderConfig) => AIProviderConfig) => void;
}) {
    return (
        <div className="mt-3 space-y-2.5">
            <Field label="API Key">
                <input
                    type="password"
                    placeholder="sk-..."
                    value={provider.apiKey}
                    onChange={(e) =>
                        update((p) => ({ ...p, apiKey: e.target.value }))
                    }
                    className={inputClass}
                />
            </Field>
            <Field label="API URL">
                <input
                    type="text"
                    value={provider.baseUrl}
                    onChange={(e) =>
                        update((p) => ({ ...p, baseUrl: e.target.value }))
                    }
                    className={inputClass}
                />
            </Field>
        </div>
    );
}


function ModelList({
    provider,
    update,
}: {
    provider: AIProviderConfig;
    update: (fn: (p: AIProviderConfig) => AIProviderConfig) => void;
}) {
    const [showAddModel, setShowAddModel] = useState(false);
    const [newModelId, setNewModelId] = useState("");
    const [newModelName, setNewModelName] = useState("");

    const toggleModel = (model: AIModelConfig) =>
        update((p) => ({
            ...p,
            enabled: !model.enabled || p.enabled,
            models: p.models.map((m) =>
                m.id === model.id ? { ...m, enabled: !m.enabled } : m,
            ),
        }));

    const removeModel = (model: AIModelConfig) =>
        update((p) => ({
            ...p,
            models: p.models.filter((m) => m.id !== model.id),
        }));

    function addModel() {
        const id = newModelId.trim();
        if (!id || provider.models.some((m) => m.id === id)) return;
        update((p) => ({
            ...p,
            models: [
                ...p.models,
                { id, name: newModelName.trim() || id, enabled: false },
            ],
        }));
        setShowAddModel(false);
        setNewModelId("");
        setNewModelName("");
    }

    function cancelAddModel() {
        setShowAddModel(false);
        setNewModelId("");
        setNewModelName("");
    }

    return (
        <div className="mt-3">
            <label className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-brand-500 dark:text-brand-400">
                <span>模型</span>
                {!showAddModel && (
                    <button
                        type="button"
                        className="rounded-md px-1.5 py-0.5 text-[10px] text-brand-500 transition hover:bg-brand-100 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-700/40 dark:hover:text-brand-200"
                        onClick={() => setShowAddModel(true)}
                    >
                        + 添加模型
                    </button>
                )}
            </label>
            <div className="space-y-1">
                {provider.models.map((model) => (
                    <div
                        key={model.id}
                        className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-brand-100/60 dark:hover:bg-brand-700/40"
                    >
                        <label className="flex flex-1 cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={model.enabled}
                                className="size-3.5 accent-brand-900 dark:accent-brand-50"
                                onChange={() => toggleModel(model)}
                            />
                            <span className="text-xs text-brand-700 dark:text-brand-300">
                                {model.name}
                            </span>
                        </label>
                        <button
                            type="button"
                            className="flex size-5 items-center justify-center rounded text-brand-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 dark:text-brand-500 dark:hover:bg-red-500/20"
                            title="删除模型"
                            onClick={() => removeModel(model)}
                        >
                            <Trash2 className="size-3.5" />
                        </button>
                    </div>
                ))}

                {showAddModel && (
                    <div className="space-y-1.5 rounded-md border border-brand-200/60 bg-white/60 p-2 dark:border-brand-700 dark:bg-white/[0.02]">
                        <input
                            type="text"
                            placeholder="模型 ID (如 gpt-4o)"
                            value={newModelId}
                            onChange={(e) => setNewModelId(e.target.value)}
                            className={`${inputClass} px-2 py-1`}
                        />
                        <input
                            type="text"
                            placeholder="显示名称 (可选,留空用 ID)"
                            value={newModelName}
                            onChange={(e) => setNewModelName(e.target.value)}
                            className={`${inputClass} px-2 py-1`}
                        />
                        <div className="flex gap-1.5">
                            <Button size="xs" variant="primary" onClick={addModel}>
                                保存
                            </Button>
                            <Button
                                size="xs"
                                variant="ghost"
                                onClick={cancelAddModel}
                            >
                                取消
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


export function ProviderCard({ provider, onChange }: ProviderCardProps) {
    const update = (fn: (p: AIProviderConfig) => AIProviderConfig) =>
        onChange(fn(provider));

    return (
        <div className="rounded-2xl border border-brand-200/50 bg-white/70 p-3 shadow-soft backdrop-blur dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{provider.name}</span>
                    {provider.enabled && (
                        <span className="rounded bg-brand-200/60 px-1.5 py-0.5 text-[10px] text-brand-600 dark:bg-brand-700 dark:text-brand-300">
                            已启用
                        </span>
                    )}
                </div>
                <Switch
                    checked={provider.enabled}
                    onChange={(v) => update((p) => ({ ...p, enabled: v }))}
                />
            </div>

            {provider.enabled && (
                <>
                    <ProviderFields provider={provider} update={update} />
                    <ModelList provider={provider} update={update} />
                </>
            )}
        </div>
    );
}
