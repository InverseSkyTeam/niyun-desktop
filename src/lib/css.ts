import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function css(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
