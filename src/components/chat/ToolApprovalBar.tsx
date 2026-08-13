import { ShieldAlert } from "lucide-react";
import type { ToolApprovalRequest } from "@/lib/types";
import { toolDescriptions } from "@/lib/tools";
import { Button } from "@/components/ui/Button";
import { useChatStore } from "@/stores/chatStore";

const INPUT_LABELS: Record<string, string> = {
    path: "路径",
    command: "命令",
    content: "内容",
};
const MAX_INPUT_LEN = 120;

function describeValue(v: unknown): string {
    const val = typeof v === "string" ? v : JSON.stringify(v);
    return val.length > MAX_INPUT_LEN
        ? val.slice(0, MAX_INPUT_LEN) + "..."
        : val;
}

function formatEntry([key, value]: [string, unknown]): string {
    return `${INPUT_LABELS[key] || key}: ${describeValue(value)}`;
}

function formatInput(input: unknown): string {
    if (typeof input === "string") return input;
    if (typeof input === "object" && input !== null) {
        return Object.entries(input as Record<string, unknown>)
            .map(formatEntry)
            .join("\n");
    }
    return JSON.stringify(input);
}

export function ToolApprovalBar() {
    const requests = useChatStore((s) => s.approvalRequests);
    const handleApprove = useChatStore((s) => s.handleApprove);
    const handleDeny = useChatStore((s) => s.handleDeny);

    if (requests.length === 0) return null;

    return (
        <div className="mx-auto w-full max-w-3xl px-6 py-2">
            <div className="mt-2 space-y-2">
                {requests.map((req: ToolApprovalRequest) => (
                    <div
                        key={req.id}
                        className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-700 dark:bg-brand-800/50"
                    >
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="size-4 shrink-0 text-brand-500" />
                            <span className="text-sm font-medium text-brand-800 dark:text-brand-100">
                                {toolDescriptions[req.toolName as keyof typeof toolDescriptions] ||
                                    req.toolName}
                            </span>
                            <span className="rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[10px] text-brand-500 dark:bg-brand-700 dark:text-brand-400">
                                {req.toolName}
                            </span>
                            <span className="ml-auto flex shrink-0 gap-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    onClick={handleDeny}
                                >
                                    拒绝
                                </Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="xs"
                                    onClick={handleApprove}
                                >
                                    批准
                                </Button>
                            </span>
                        </div>
                        {formatInput(req.input) !== "" && (
                            <div className="mt-2 rounded-lg px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-brand-600 dark:bg-brand-900/50 dark:text-brand-400">
                                {formatInput(req.input)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
