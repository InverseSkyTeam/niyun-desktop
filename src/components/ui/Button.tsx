import type { ButtonHTMLAttributes } from "react";
import { css } from "@/lib/css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "outline" | "ghost" | "icon" | "chip";
    size?: "xs" | "sm" | "md";
    active?: boolean;
    danger?: boolean;
    block?: boolean;
    align?: "start" | "center";
}

const sizes = {
    xs: "px-2.5 py-2 text-xs",
    sm: "px-3 py-2 text-xs",
    md: "px-3.5 py-2.5 text-sm",
} as const;

export function Button({
    variant = "ghost",
    size = "md",
    active = false,
    danger = false,
    block = false,
    align = "center",
    className,
    type = "button",
    children,
    ...rest
}: ButtonProps) {
    const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
        primary:
            "bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white shadow-glow hover:brightness-110 hover:shadow-glow-lg",
        outline: active
            ? "border border-brand-500 bg-brand-500 text-white shadow-glow"
            : "border border-brand-200 bg-white text-brand-700 hover:border-brand-300 hover:bg-brand-50 dark:border-brand-800 dark:bg-ink/60 dark:text-brand-200 dark:hover:bg-brand-950",
        chip: "rounded-full border border-brand-200 text-brand-600 hover:border-brand-400 hover:bg-brand-100 dark:border-brand-800 dark:text-brand-300 dark:hover:bg-brand-950",
        icon: danger
            ? "text-brand-400 hover:bg-red-500 hover:text-white"
            : "text-brand-400 hover:bg-brand-100 hover:text-brand-700 dark:text-brand-300 dark:hover:bg-white/10 dark:hover:text-white",
        ghost: active
            ? "bg-gradient-to-r from-brand-600 to-brand-800 text-white shadow-glow"
            : "text-brand-600 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-white/10",
    };

    return (
        <button
            type={type}
            className={css(
                className,
                "inline-flex items-center gap-1.5 rounded-xl font-medium transition active:scale-[0.98] focus:outline-none disabled:pointer-events-none disabled:opacity-40",
                align === "start" ? "justify-start" : "justify-center",
                variant === "icon" ? "size-8 shrink-0" : sizes[size],
                variantClass[variant],
                block && "w-full",
            )}
            {...rest}
        >
            {children}
        </button>
    );
}
