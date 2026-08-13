import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { css } from "@/lib/css";
import type { AiModelGroup } from "@/stores/aiConfigStore";

interface ModelDropdownProps {
    activeModel: string;
    groups: AiModelGroup[];
    onSelect: (modelId: string) => void;
}


function findActiveModelName(groups: AiModelGroup[], activeModel: string): string {
    const active = groups
        .flatMap((g) => g.models)
        .find((m) => m.id === activeModel);
    return active?.name ?? "选择模型";
}


function ModelOptionList({
    groups,
    activeModel,
    onPick,
}: {
    groups: AiModelGroup[];
    activeModel: string;
    onPick: (modelId: string) => void;
}) {
    return (
        <ul
            role="listbox"
            className="absolute bottom-full left-0 z-50 mb-1.5 flex max-h-60 w-44 scrollbar-thin flex-col gap-0.5 overflow-y-auto rounded-lg border border-brand-200 bg-white p-1 shadow-lg dark:border-brand-700 dark:bg-brand-800"
        >
            {groups.map((g) => (
                <li key={g.providerId}>
                    <p className="px-2.5 py-1 text-[10px] font-medium tracking-wider text-brand-400 uppercase dark:text-brand-500">
                        {g.providerName}
                    </p>
                    {g.models.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            role="option"
                            aria-selected={m.id === activeModel}
                            className={css(
                                "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs transition",
                                m.id === activeModel
                                    ? "bg-brand-200/60 font-medium text-black dark:bg-brand-50 dark:text-brand-900"
                                    : "text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700",
                            )}
                            onClick={() => onPick(m.id)}
                        >
                            <span className="truncate">{m.name}</span>
                            {m.id === activeModel && (
                                <Check className="size-3.5 shrink-0" />
                            )}
                        </button>
                    ))}
                </li>
            ))}
        </ul>
    );
}


export function ModelDropdown({ activeModel, groups, onSelect }: ModelDropdownProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const activeName = findActiveModelName(groups, activeModel);

    function pick(modelId: string) {
        onSelect(modelId);
        setMenuOpen(false);
    }

    return (
        <div className="relative">
            <button
                type="button"
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-200/60 dark:text-brand-300 dark:hover:bg-brand-700"
                onClick={() => setMenuOpen((v) => !v)}
            >
                <span className="max-w-[7rem] truncate">{activeName}</span>
                <ChevronDown className="size-3 opacity-60" />
            </button>

            {menuOpen && (
                <>
                    <button
                        type="button"
                        tabIndex={-1}
                        aria-hidden="true"
                        className="fixed inset-0 z-40 cursor-default"
                        onClick={() => setMenuOpen(false)}
                    />
                    <ModelOptionList
                        groups={groups}
                        activeModel={activeModel}
                        onPick={pick}
                    />
                </>
            )}
        </div>
    );
}
