import { css } from "@/lib/css";

interface SwitchProps {
    checked?: boolean;
    size?: "sm" | "default";
    disabled?: boolean;
    className?: string;
    onChange?: (v: boolean) => void;
}

export function Switch({
    checked = false,
    size = "default",
    disabled = false,
    className,
    onChange,
}: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            data-size={size}
            className={css(
                "relative inline-flex shrink-0 items-center rounded-full transition-all outline-none",
                size === "default" ? "h-5 w-9" : "h-4 w-7",
                checked
                    ? "bg-gradient-to-r from-brand-600 to-brand-800 shadow-glow"
                    : "bg-brand-200 dark:bg-white/15",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "focus-visible:ring-3 focus-visible:ring-brand-300/50",
                className,
            )}
            onClick={() => {
                if (!disabled) onChange?.(!checked);
            }}
        >
            <span
                className={css(
                    "pointer-events-none block rounded-full bg-white shadow-sm transition-transform",
                    size === "default" ? "size-4" : "size-3",
                    checked
                        ? size === "default"
                            ? "translate-x-4"
                            : "translate-x-3"
                        : "translate-x-0.5",
                )}
            />
        </button>
    );
}
